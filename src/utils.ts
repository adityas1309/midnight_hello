// Shadow Run — Shared Utilities for Midnight Preprod
// Based on the official example-hello-world/src/utils.ts pattern

import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocket } from 'ws';
import * as Rx from 'rxjs';
import { Buffer } from 'buffer';

// Midnight SDK imports
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import {
  createKeystore,
  InMemoryTransactionHistoryStorage,
  PublicKey,
  UnshieldedWallet,
} from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { ContractExecutable } from '@midnight-ntwrk/compact-js';
import { ProvableCircuitId } from '@midnight-ntwrk/compact-js/effect/Contract';
import { ContractState as RuntimeContractState } from '@midnight-ntwrk/compact-runtime';
import { submitTx } from '@midnight-ntwrk/midnight-js-contracts';
import { nativeToken, unshieldedToken } from '@midnight-ntwrk/ledger-v8';
import { makeContractExecutableRuntime, asContractAddress, exitResultOrError, SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import { parseCoinPublicKeyToHex, parseEncPublicKeyToHex, assertDefined, assertIsContractAddress, ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';

// Enable WebSocket for GraphQL subscriptions
// @ts-expect-error Required for wallet sync
globalThis.WebSocket = WebSocket;

export const NETWORK_ID = 'undeployed';
export const NETWORK_LABEL = 'Midnight Local (Undeployed)';
export const TEST_LOG_FILE_NAME = 'local-test-log.txt';

setNetworkId(NETWORK_ID);

// ─── Network Configuration ────────────────────────────────────────────────────

export const CONFIG = {
  indexer: 'http://127.0.0.1:8088/api/v4/graphql',
  indexerWS: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
  node: 'http://127.0.0.1:9944',
  proofServer: 'http://127.0.0.1:6300',
};

// Wallet seed for testing (from user context)
export const TEST_SEED = '3921ed062076f5f95287cfc0d4f0c148ab9db23363f7ef3fdfdf92d124661fbb';
const GENESIS_SENDER_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

// ─── Path Helpers ──────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getZkConfigPath(contractName: string): string {
  return path.resolve(__dirname, '..', 'contracts', 'managed', contractName);
}

// ─── Contract Loaders ──────────────────────────────────────────────────────────

export async function loadCompiledContract(contractName: string) {
  const zkConfigPath = getZkConfigPath(contractName);
  const contractPath = path.join(zkConfigPath, 'contract', 'index.js');
  const contractModule = await import(pathToFileURL(contractPath).href);

  const compiledContract = CompiledContract.make(contractName, contractModule.Contract).pipe(
    CompiledContract.withVacantWitnesses,
    CompiledContract.withCompiledFileAssets(zkConfigPath),
  );

  return { contractModule, compiledContract, zkConfigPath };
}

export async function loadCompiledContractWithWitnesses(contractName: string, witnesses: any) {
  const zkConfigPath = getZkConfigPath(contractName);
  const contractPath = path.join(zkConfigPath, 'contract', 'index.js');
  const contractModule = await import(pathToFileURL(contractPath).href);

  const compiledContract = CompiledContract.make(contractName, contractModule.Contract).pipe(
    CompiledContract.withWitnesses(witnesses as never),
    CompiledContract.withCompiledFileAssets(zkConfigPath),
  );

  return { contractModule, compiledContract, zkConfigPath };
}

// ─── Wallet Functions ──────────────────────────────────────────────────────────

export function deriveKeys(seed: string) {
  const hdWallet = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
  if (hdWallet.type !== 'seedOk') throw new Error('Invalid seed');

  const result = hdWallet.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);

  if (result.type !== 'keysDerived') throw new Error('Key derivation failed');

  hdWallet.hdWallet.clear();
  return result.keys;
}

export async function createWallet(seed: string) {
  const keys = deriveKeys(seed);
  const networkId = getNetworkId();
  const txHistoryStorage = new InMemoryTransactionHistoryStorage();
  const costParameters = {
    additionalFeeOverhead: 300_000_000_000_000n,
    feeBlocksMargin: 5,
  };

  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], networkId);

  const walletConfig = {
    networkId,
    indexerClientConnection: {
      indexerHttpUrl: CONFIG.indexer,
      indexerWsUrl: CONFIG.indexerWS,
    },
    txHistoryStorage,
    costParameters,
    provingServerUrl: new URL(CONFIG.proofServer),
    relayURL: new URL(CONFIG.node.replace(/^http/, 'ws')),
  };

  const shieldedWallet = ShieldedWallet(walletConfig).startWithSecretKeys(shieldedSecretKeys);

  const unshieldedWallet = UnshieldedWallet({
    networkId,
    indexerClientConnection: walletConfig.indexerClientConnection,
    txHistoryStorage,
  }).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore));

  const dustWallet = DustWallet({
    ...walletConfig,
  }).startWithSecretKey(dustSecretKey, ledger.LedgerParameters.initialParameters().dust);

  const wallet = await WalletFacade.init({
    configuration: walletConfig,
    shielded: async () => shieldedWallet,
    unshielded: async () => unshieldedWallet,
    dust: async () => dustWallet,
  });
  await Promise.all([
    shieldedWallet.start(shieldedSecretKeys),
    unshieldedWallet.start(),
    dustWallet.start(dustSecretKey),
  ]);

  return { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore };
}

export function getFundingAddress(
  walletCtx: Awaited<ReturnType<typeof createWallet>>,
): string {
  return walletCtx.unshieldedKeystore.getBech32Address().asString();
}

export function printFundingHint(
  walletCtx: Awaited<ReturnType<typeof createWallet>>,
): void {
  console.log(`  Funding address: ${getFundingAddress(walletCtx)}`);
  console.log('  Fund this address with midnight-local-dev option 2, or use option 1 with a mnemonic wallet.');
}

// ─── Transaction Signing ───────────────────────────────────────────────────────

export function signTransactionIntents(
  tx: { intents?: Map<number, any> },
  signFn: (payload: Uint8Array) => ledger.Signature,
  proofMarker: 'proof' | 'pre-proof',
): void {
  if (!tx.intents || tx.intents.size === 0) return;

  for (const segment of tx.intents.keys()) {
    const intent = tx.intents.get(segment);
    if (!intent) continue;

    const cloned = ledger.Intent.deserialize<
      ledger.SignatureEnabled,
      ledger.Proofish,
      ledger.PreBinding
    >('signature', proofMarker, 'pre-binding', intent.serialize());

    const sigData = cloned.signatureData(segment);
    const signature = signFn(sigData);

    if (cloned.fallibleUnshieldedOffer) {
      const sigs = cloned.fallibleUnshieldedOffer.inputs.map(
        (_: any, i: number) =>
          cloned.fallibleUnshieldedOffer!.signatures.at(i) ?? signature,
      );
      cloned.fallibleUnshieldedOffer =
        cloned.fallibleUnshieldedOffer.addSignatures(sigs);
    }

    if (cloned.guaranteedUnshieldedOffer) {
      const sigs = cloned.guaranteedUnshieldedOffer.inputs.map(
        (_: any, i: number) =>
          cloned.guaranteedUnshieldedOffer!.signatures.at(i) ?? signature,
      );
      cloned.guaranteedUnshieldedOffer =
        cloned.guaranteedUnshieldedOffer.addSignatures(sigs);
    }

    tx.intents.set(segment, cloned);
  }
}

// ─── Provider Factory ──────────────────────────────────────────────────────────

export async function createProviders(
  walletCtx: Awaited<ReturnType<typeof createWallet>>,
  contractName: string,
) {
  const zkConfigPath = getZkConfigPath(contractName);
  const accountId = walletCtx.unshieldedKeystore.getBech32Address().asString();
  const privateStoragePassword = `${TEST_SEED}:${contractName}:private-state`;

  const state = await Rx.firstValueFrom(
    walletCtx.wallet.state().pipe(Rx.filter((s) => s.isSynced)),
  );

  const walletProvider = {
    getCoinPublicKey: () => state.shielded.coinPublicKey.toHexString(),
    getEncryptionPublicKey: () => state.shielded.encryptionPublicKey.toHexString(),
    async balanceTx(tx: any, ttl?: Date) {
      const recipe = await walletCtx.wallet.balanceUnboundTransaction(
        tx,
        {
          shieldedSecretKeys: walletCtx.shieldedSecretKeys,
          dustSecretKey: walletCtx.dustSecretKey,
        },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );

      const signFn = (payload: Uint8Array) =>
        walletCtx.unshieldedKeystore.signData(payload);

      signTransactionIntents(recipe.baseTransaction, signFn, 'proof');
      if (recipe.balancingTransaction) {
        signTransactionIntents(recipe.balancingTransaction, signFn, 'pre-proof');
      }

      return walletCtx.wallet.finalizeRecipe(recipe);
    },
    submitTx: (tx: any) => walletCtx.wallet.submitTransaction(tx) as any,
  };

  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: `${contractName}-state`,
      privateStoragePasswordProvider: () => privateStoragePassword,
      accountId,
    }),
    publicDataProvider: indexerPublicDataProvider(
      CONFIG.indexer,
      CONFIG.indexerWS,
    ),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(CONFIG.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };
}

const DEFAULT_SEGMENT_NUMBER = 0;

function serializeCoinInfo(coinInfo: { nonce: string; type: string; value: bigint }) {
  return JSON.stringify({
    ...coinInfo,
    value: { __big_int_val__: coinInfo.value.toString() },
  });
}

function serializeQualifiedShieldedCoinInfo(coinInfo: { mt_index: bigint; nonce: string; type: string; value: bigint }) {
  const { mt_index: _ignored, ...rest } = coinInfo;
  return serializeCoinInfo(rest);
}

function shortHex(value: string | undefined) {
  if (!value) return 'undefined';
  return value.startsWith('0x') ? value.slice(2, 10) : value.slice(0, 8);
}

function serializeZswapOutput(output: any) {
  return `${serializeCoinInfo(output.coinInfo)}:${JSON.stringify(output.recipient)}`;
}

function deserializeCoinInfo(coinInfo: string) {
  return JSON.parse(coinInfo, (key, value) => {
    if (
      key === 'value' &&
      value != null &&
      typeof value === 'object' &&
      '__big_int_val__' in value &&
      typeof value.__big_int_val__ === 'string'
    ) {
      return BigInt(value.__big_int_val__);
    }
    return value;
  });
}

function createZswapOutput(
  output: any,
  encryptionPublicKey: string,
  segmentNumber = DEFAULT_SEGMENT_NUMBER,
) {
  return output.recipient.is_left
    ? ledger.ZswapOutput.new(output.coinInfo, segmentNumber, output.recipient.left, encryptionPublicKey)
    : ledger.ZswapOutput.newContractOwned(output.coinInfo, segmentNumber, output.recipient.right);
}

function unprovenOfferFromMap(map: Map<string, any>, fromOffer: (value: any, type: string, amount: bigint) => any) {
  if (map.size === 0) return undefined;

  const offers = Array.from(map, ([coinInfo, unproven]) => {
    const { type, value } = deserializeCoinInfo(coinInfo);
    return fromOffer(unproven, type, value);
  }).filter(Boolean);

  if (offers.length === 0) return undefined;
  if (offers.length === 1) return offers[0];
  return offers.reduce((acc, curr) => acc.merge(curr));
}

function zswapStateToOffer(
  zswapLocalState: any,
  encryptionPublicKey: string,
  addressAndChainStateTuple?: { contractAddress: string; zswapChainState: any },
) {
  const unprovenOutputs = new Map<string, any>(
    zswapLocalState.outputs.map((output: any) => [
      serializeCoinInfo(output.coinInfo),
      createZswapOutput(output, encryptionPublicKey, DEFAULT_SEGMENT_NUMBER),
    ]),
  );

  const unprovenInputs = new Map<string, any>();
  const unprovenTransients = new Map<string, any>();

  zswapLocalState.inputs.forEach((qualifiedCoinInfo: any) => {
    const serializedCoinInfo = serializeQualifiedShieldedCoinInfo(qualifiedCoinInfo);
    const unprovenOutput = unprovenOutputs.get(serializedCoinInfo);

    if (unprovenOutput) {
      unprovenTransients.set(
        serializedCoinInfo,
        ledger.ZswapTransient.newFromContractOwnedOutput(
          qualifiedCoinInfo,
          DEFAULT_SEGMENT_NUMBER,
      unprovenOutput as any,
        ),
      );
      unprovenOutputs.delete(serializedCoinInfo);
      return;
    }

    assertDefined(
      addressAndChainStateTuple,
      'Only outputs or transients are expected when no chain state is provided',
    );
    assertIsContractAddress(addressAndChainStateTuple.contractAddress);
    unprovenInputs.set(
      serializedCoinInfo,
      ledger.ZswapInput.newContractOwned(
        qualifiedCoinInfo,
        DEFAULT_SEGMENT_NUMBER,
        addressAndChainStateTuple.contractAddress,
        addressAndChainStateTuple.zswapChainState,
      ),
    );
  });

  const offers = [
    unprovenOfferFromMap(unprovenInputs, ledger.ZswapOffer.fromInput),
    unprovenOfferFromMap(unprovenOutputs, ledger.ZswapOffer.fromOutput),
    unprovenOfferFromMap(unprovenTransients, ledger.ZswapOffer.fromTransient),
  ].filter(Boolean) as any[];

  if (offers.length === 0) return undefined;
  if (offers.length === 1) return offers[0];
  return offers.reduce((acc, curr) => acc.merge(curr));
}

function subtractZswapLocalState(previousState: any, nextState: any) {
  const priorInputKeys = new Set((previousState?.inputs ?? []).map((input: any) => serializeQualifiedShieldedCoinInfo(input)));
  const priorOutputKeys = new Set((previousState?.outputs ?? []).map((output: any) => serializeZswapOutput(output)));

  return {
    ...nextState,
    inputs: (nextState.inputs ?? []).filter(
      (input: any) => !priorInputKeys.has(serializeQualifiedShieldedCoinInfo(input)),
    ),
    outputs: (nextState.outputs ?? []).filter(
      (output: any) => !priorOutputKeys.has(serializeZswapOutput(output)),
    ),
  };
}

function mergeZswapOffers(offers: Array<any | undefined>) {
  const presentOffers = offers.filter(Boolean);
  if (presentOffers.length === 0) {
    return undefined;
  }
  if (presentOffers.length === 1) {
    return presentOffers[0];
  }
  return presentOffers.reduce((acc, curr) => acc.merge(curr));
}

function zswapDeltaToContinuationOffer(
  zswapLocalState: any,
  encryptionPublicKey: string,
  addressAndChainStateTuple?: { contractAddress: string; zswapChainState: any },
) {
  const preparedOutputs = (zswapLocalState.outputs ?? []).map((output: any) => ({
    output,
    unprovenOutput: createZswapOutput(output, encryptionPublicKey, DEFAULT_SEGMENT_NUMBER),
  }));
  const remainingOutputs = new Set(preparedOutputs.map((_, index: number) => index));
  const offers: any[] = [];

  const userOutputIndexes = preparedOutputs
    .map(({ output }: any, index: number) => ({ index, output }))
    .filter(({ output }: any) => output.recipient?.is_left)
    .map(({ index }: any) => index);

  if ((zswapLocalState.inputs ?? []).length > 0 && (zswapLocalState.inputs ?? []).length === userOutputIndexes.length) {
    (zswapLocalState.inputs ?? []).forEach((input: any, index: number) => {
      const outputIndex = userOutputIndexes[index];
      try {
        offers.push(
          ledger.ZswapOffer.fromTransient(
            ledger.ZswapTransient.newFromContractOwnedOutput(
              { ...input, mt_index: 0n },
              DEFAULT_SEGMENT_NUMBER,
              preparedOutputs[outputIndex].unprovenOutput,
            ),
          ),
        );
        remainingOutputs.delete(outputIndex);
      } catch (error) {
        throw new Error(
          `Failed to build contract continuation transient ${index}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  } else {
    (zswapLocalState.inputs ?? []).forEach((input: any, index: number) => {
      const serializedCoinInfo = serializeQualifiedShieldedCoinInfo(input);
      const matchingOutputIndex = preparedOutputs.findIndex(
        ({ output }: any, outputIndex: number) =>
          remainingOutputs.has(outputIndex) && serializeCoinInfo(output.coinInfo) === serializedCoinInfo,
      );

      try {
        if (matchingOutputIndex >= 0) {
          offers.push(
            ledger.ZswapOffer.fromTransient(
              ledger.ZswapTransient.newFromContractOwnedOutput(
                { ...input, mt_index: 0n },
                DEFAULT_SEGMENT_NUMBER,
                preparedOutputs[matchingOutputIndex].unprovenOutput,
              ),
            ),
          );
          remainingOutputs.delete(matchingOutputIndex);
          return;
        }

        assertDefined(
          addressAndChainStateTuple,
          'Only outputs or transients are expected when no chain state is provided',
        );
        offers.push(
          ledger.ZswapOffer.fromInput(
            ledger.ZswapInput.newContractOwned(
              input,
              DEFAULT_SEGMENT_NUMBER,
              addressAndChainStateTuple.contractAddress,
              addressAndChainStateTuple.zswapChainState,
            ),
          ),
        );
      } catch (error) {
        throw new Error(
          `Failed to build contract continuation offer for input ${index}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  Array.from(remainingOutputs.values()).forEach((outputIndex: any) => {
    try {
      offers.push(ledger.ZswapOffer.fromOutput(preparedOutputs[outputIndex].unprovenOutput));
    } catch (error) {
      throw new Error(
        `Failed to build contract continuation offer for output ${outputIndex}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });

  return mergeZswapOffers(offers);
}

function toLedgerContractState(contractState: any) {
  return ledger.ContractState.deserialize(contractState.serialize());
}

function createUnprovenLedgerCallTx(
  circuitId: string,
  contractAddress: string,
  initialContractState: any,
  zswapChainState: any,
  publicTranscript: any[],
  privateTranscriptOutputs: any[],
  input: any,
  output: any,
  nextZswapLocalState: any,
  encryptionPublicKey: string,
  ledgerParameters: any,
) {
  const ledgerContractState = toLedgerContractState(initialContractState);
  const op = ledgerContractState.operation(circuitId);
  assertDefined(op, `Operation '${circuitId}' is undefined for contract state ${initialContractState.toString(false)}`);

  const queryContext = new ledger.QueryContext(ledgerContractState.data, contractAddress);
  queryContext.block = {
    ...queryContext.block,
    balance: ledgerContractState.balance,
    ownAddress: contractAddress,
    secondsSinceEpoch: BigInt(Math.floor(Date.now() / 1_000)),
  };

  const preTranscript = new ledger.PreTranscript(queryContext, publicTranscript);
  const call = new ledger.PrePartitionContractCall(
    contractAddress,
    circuitId,
    op,
    preTranscript,
    privateTranscriptOutputs,
    input,
    output,
    ledger.communicationCommitmentRandomness(),
    circuitId,
  );

  return ledger.Transaction.fromPartsRandomized(
    getNetworkId(),
    zswapStateToOffer(nextZswapLocalState, encryptionPublicKey, {
      contractAddress,
      zswapChainState,
    }),
    undefined,
  ).addCalls({ tag: 'random' }, [call], ledgerParameters, ttlOneHour());
}

function encryptionPublicKeyForZswapState(
  zswapState: any,
  walletCoinPublicKey: string,
  walletEncryptionPublicKey: string,
) {
  const networkId = getNetworkId();
  const walletCoinPublicKeyLocal = parseCoinPublicKeyToHex(walletCoinPublicKey, networkId);
  const localCoinPublicKey = parseCoinPublicKeyToHex(zswapState.coinPublicKey, networkId);
  if (localCoinPublicKey !== walletCoinPublicKeyLocal) {
    throw new Error('Unable to lookup encryption public key (Unsupported coin)');
  }
  return parseEncPublicKeyToHex(walletEncryptionPublicKey, networkId);
}

export async function submitContractCallWithLocalState(
  providers: Awaited<ReturnType<typeof createProviders>>,
  options: {
    compiledContract: any;
    contractAddress: string;
    circuitId: string;
    privateStateId: string;
    args?: any[];
    initialZswapLocalState: any;
    priorContractOutputs?: any[];
  },
) {
  providers.privateStateProvider.setContractAddress(options.contractAddress);

  const [rawZswapChainState, contractState, ledgerParameters] =
    (await providers.publicDataProvider.queryZSwapAndContractState(options.contractAddress)) ?? [];
  if (!rawZswapChainState || !contractState || !ledgerParameters) {
    throw new Error(`No contract state found on chain for contract address '${options.contractAddress}'`);
  }
  const zswapChainState = rawZswapChainState.postBlockUpdate(new Date());

  const privateState = await providers.privateStateProvider.get(options.privateStateId);
  const walletCoinPublicKey = providers.walletProvider.getCoinPublicKey();
  const contractExec = ContractExecutable.make(options.compiledContract);
  const contractRuntime = makeContractExecutableRuntime(providers.zkConfigProvider, {
    coinPublicKey: parseCoinPublicKeyToHex(walletCoinPublicKey, getNetworkId()),
  });

  const exitResult = await contractRuntime.runPromiseExit(
    contractExec.circuit(
      ProvableCircuitId(options.circuitId as never),
      {
        address: asContractAddress(options.contractAddress),
        contractState: RuntimeContractState.deserialize(contractState.serialize()),
        privateState: privateState ?? {},
        ledgerParameters,
        zswapLocalState: options.initialZswapLocalState,
      },
      ...(options.args ?? []),
    ),
  );

  let callResult: any;
  try {
    callResult = exitResultOrError(exitResult as never) as any;
  } catch (error) {
    const message = error instanceof Error
      ? [
        error.message,
        error.cause instanceof Error ? `cause: ${error.cause.message}` : undefined,
        error.cause instanceof Error ? `cause stack: ${error.cause.stack}` : undefined,
        error.stack ? `stack: ${error.stack}` : undefined,
      ].filter(Boolean).join(' | ')
      : String(error);
    throw new Error(`Error executing circuit '${options.circuitId}': ${message}`);
  }

  const {
    public: { contractState: nextContractState, partitionedTranscript, publicTranscript },
    private: { input, output, privateState: nextPrivateState, privateTranscriptOutputs, result, zswapLocalState },
  } = callResult;

  const encryptionPublicKey = encryptionPublicKeyForZswapState(
    zswapLocalState,
    walletCoinPublicKey,
    providers.walletProvider.getEncryptionPublicKey(),
  );
  const manualOffer = zswapLocalStateToOfferWithZeroIndexTransients(
    zswapLocalState,
    encryptionPublicKey,
    {
      contractAddress: options.contractAddress,
      zswapChainState,
    },
  );

  let unprovenTx: any;
  try {
    const ledgerContractState = toLedgerContractState(
      RuntimeContractState.deserialize(contractState.serialize()),
    );
    const op = ledgerContractState.operation(options.circuitId);
    assertDefined(
      op,
      `Operation '${options.circuitId}' is undefined for contract state ${contractState.toString(false)}`,
    );

    const queryContext = new ledger.QueryContext(ledgerContractState.data, options.contractAddress);
    queryContext.block = {
      ...queryContext.block,
      balance: ledgerContractState.balance,
      ownAddress: options.contractAddress,
      secondsSinceEpoch: BigInt(Math.floor(Date.now() / 1_000)),
    };

    const preTranscript = new ledger.PreTranscript(queryContext, publicTranscript);
    const call = new ledger.PrePartitionContractCall(
      options.contractAddress,
      options.circuitId,
      op,
      preTranscript,
      privateTranscriptOutputs,
      input,
      output,
      ledger.communicationCommitmentRandomness(),
      options.circuitId,
    );

    unprovenTx = ledger.Transaction.fromPartsRandomized(
      getNetworkId(),
      manualOffer,
      undefined,
    ).addCalls({ tag: 'random' }, [call], ledgerParameters, ttlOneHour());

    const guaranteedOffer = manualOffer;
    const fallibleOffers = unprovenTx.fallibleOffer
      ? Array.from(unprovenTx.fallibleOffer.values())
      : [];
    zswapLocalState.inputs.forEach((input: any, idx: number) => {
      console.log(
        `  Debug ${options.circuitId}: input[${idx}] nonce=${shortHex(input.nonce)} value=${input.value} mt_index=${input.mt_index}`,
      );
    });
    zswapLocalState.outputs.forEach((out: any, idx: number) => {
      console.log(
        `  Debug ${options.circuitId}: output[${idx}] nonce=${shortHex(out.coinInfo?.nonce)} value=${out.coinInfo?.value} recipient=${out.recipient?.is_left ? 'user' : 'contract'}`,
      );
    });
    console.log(
      `  Debug ${options.circuitId}: localState inputs=${zswapLocalState.inputs.length}, outputs=${zswapLocalState.outputs.length}, currentIndex=${zswapLocalState.currentIndex}`,
    );
    console.log(
      `  Debug ${options.circuitId}: localState inputs=${zswapLocalState.inputs.length}, outputs=${zswapLocalState.outputs.length}, currentIndex=${zswapLocalState.currentIndex}`,
    );
    console.log(
      `  Debug ${options.circuitId}: guaranteed inputs=${guaranteedOffer?.inputs?.length ?? 0}, outputs=${guaranteedOffer?.outputs?.length ?? 0}, transients=${guaranteedOffer?.transients?.length ?? 0}, chainFirstFree=${zswapChainState.firstFree}`,
    );
    fallibleOffers.forEach((offer: any, idx: number) => {
      console.log(
        `  Debug ${options.circuitId}: fallible[${idx}] inputs=${offer.inputs?.length ?? 0}, outputs=${offer.outputs?.length ?? 0}, transients=${offer.transients?.length ?? 0}`,
      );
    });
  } catch (error) {
    throw new Error(`Error building ledger tx for '${options.circuitId}': ${error instanceof Error ? error.message : String(error)}`);
  }

  let finalized: any;
  try {
    finalized = await submitTx(providers as any, {
      unprovenTx,
      circuitId: options.circuitId as never,
    });
  } catch (error) {
    throw new Error(`Error submitting tx for '${options.circuitId}': ${error instanceof Error ? error.message : String(error)}`);
  }

  if (finalized.status !== SucceedEntirely) {
    throw new Error(`Transaction failed with status ${finalized.status}`);
  }

  await providers.privateStateProvider.set(options.privateStateId, nextPrivateState);

  return {
    public: finalized,
    private: {
      input,
      output,
      result,
      nextPrivateState,
      nextZswapLocalState: zswapLocalState,
      privateTranscriptOutputs,
      partitionedTranscript,
      nextContractState,
      unprovenTx,
    },
  };
}

// ─── Wallet Sync Helpers ───────────────────────────────────────────────────────

export async function waitForSync(walletCtx: Awaited<ReturnType<typeof createWallet>>) {
  return Rx.firstValueFrom(
    walletCtx.wallet.state().pipe(
      Rx.throttleTime(5000),
      Rx.filter((s) => s.isSynced),
    ),
  );
}

export async function waitForShieldedFunds(
  walletCtx: Awaited<ReturnType<typeof createWallet>>,
  minimumBalance: bigint,
) {
  return Rx.firstValueFrom(
    walletCtx.wallet.state().pipe(
      Rx.throttleTime(5000),
      Rx.filter((s) => s.isSynced),
      Rx.map((s) => s.shielded.balances[nativeToken().raw] ?? 0n),
      Rx.filter((b) => b >= minimumBalance),
    ),
  );
}

export async function ensureShieldedFunds(
  walletCtx: Awaited<ReturnType<typeof createWallet>>,
  minimumBalance: bigint,
) {
  const synced = await waitForSync(walletCtx);
  const currentShieldedBalance = synced.shielded.balances[nativeToken().raw] ?? 0n;
  if (currentShieldedBalance >= minimumBalance) {
    return synced;
  }

  const amountToShield = minimumBalance - currentShieldedBalance;
  const genesisCtx = await createWallet(GENESIS_SENDER_SEED);
  try {
    await waitForSync(genesisCtx);
    const recipe = await genesisCtx.wallet.transferTransaction(
      [{
        type: 'shielded',
        outputs: [{
          type: nativeToken().raw,
          receiverAddress: synced.shielded.address,
          amount: amountToShield,
        }],
      }],
      {
        shieldedSecretKeys: genesisCtx.shieldedSecretKeys,
        dustSecretKey: genesisCtx.dustSecretKey,
      },
      {
        ttl: new Date(Date.now() + 30 * 60 * 1000),
        payFees: true,
      },
    );

    const finalized = await genesisCtx.wallet.finalizeRecipe(recipe as any);
    await genesisCtx.wallet.submitTransaction(finalized);
    return waitForShieldedFunds(walletCtx, minimumBalance);
  } finally {
    await genesisCtx.wallet.stop();
  }
}

export async function fundShieldedFromGenesis(
  walletCtx: Awaited<ReturnType<typeof createWallet>>,
  amount: bigint,
) {
  const synced = await waitForSync(walletCtx);
  const genesisCtx = await createWallet(GENESIS_SENDER_SEED);
  try {
    await waitForSync(genesisCtx);
    const recipe = await genesisCtx.wallet.transferTransaction(
      [{
        type: 'shielded',
        outputs: [{
          type: nativeToken().raw,
          receiverAddress: synced.shielded.address,
          amount,
        }],
      }],
      {
        shieldedSecretKeys: genesisCtx.shieldedSecretKeys,
        dustSecretKey: genesisCtx.dustSecretKey,
      },
      {
        ttl: new Date(Date.now() + 30 * 60 * 1000),
        payFees: true,
      },
    );

    const finalized = await genesisCtx.wallet.finalizeRecipe(recipe as any);
    await genesisCtx.wallet.submitTransaction(finalized);
    await waitForShieldedFunds(
      walletCtx,
      (synced.shielded.balances[nativeToken().raw] ?? 0n) + amount,
    );
  } finally {
    await genesisCtx.wallet.stop();
  }
}

export async function getSpendableShieldedCoin(
  walletCtx: Awaited<ReturnType<typeof createWallet>>,
  minimumValue: bigint,
): Promise<any> {
  const synced = await waitForSync(walletCtx);
  const nativeTokenType = nativeToken().raw;
  const availableCoins = synced.shielded.availableCoins.filter((entry: any) => {
    const coin = entry.coin;
    const tokenType = typeof coin.type === 'string'
      ? coin.type
      : typeof coin.color === 'string'
        ? coin.color
        : coin.type instanceof Uint8Array
          ? Buffer.from(coin.type).toString('hex')
          : coin.color instanceof Uint8Array
            ? Buffer.from(coin.color).toString('hex')
            : '';
    return tokenType === nativeTokenType && coin.value >= minimumValue;
  });

  availableCoins.sort((a: any, b: any) => Number(a.coin.value - b.coin.value));
  return availableCoins[0]?.coin;
}

export async function waitForFunds(walletCtx: Awaited<ReturnType<typeof createWallet>>) {
  return Rx.firstValueFrom(
    walletCtx.wallet.state().pipe(
      Rx.throttleTime(10000),
      Rx.filter((s) => s.isSynced),
      Rx.map((s) => s.unshielded.balances[unshieldedToken().raw] ?? 0n),
      Rx.filter((b) => b > 0n),
    ),
  );
}

export async function waitForDust(walletCtx: Awaited<ReturnType<typeof createWallet>>) {
  return Rx.firstValueFrom(
    walletCtx.wallet.state().pipe(
      Rx.throttleTime(5000),
      Rx.filter((s) => s.isSynced),
      Rx.filter((s) => s.dust.balance(new Date()) > 0n),
    ),
  );
}

export async function registerForDust(walletCtx: Awaited<ReturnType<typeof createWallet>>) {
  const dustState = await Rx.firstValueFrom(
    walletCtx.wallet.state().pipe(Rx.filter((s) => s.isSynced)),
  );

  if (dustState.dust.balance(new Date()) === 0n) {
    const nightUtxos = dustState.unshielded.availableCoins.filter(
      (c: any) => !c.meta?.registeredForDustGeneration,
    );

    if (nightUtxos.length > 0) {
      console.log('  Registering for DUST generation...');
      const recipe = await walletCtx.wallet.registerNightUtxosForDustGeneration(
        nightUtxos,
        walletCtx.unshieldedKeystore.getPublicKey(),
        (payload) => walletCtx.unshieldedKeystore.signData(payload),
      );
      await walletCtx.wallet.submitTransaction(
        await walletCtx.wallet.finalizeRecipe(recipe),
      );
    }

    console.log('  Waiting for DUST tokens...');
    await waitForDust(walletCtx);
  }
  console.log('  DUST tokens ready!');
}

// ─── Logging ───────────────────────────────────────────────────────────────────

import * as fs from 'node:fs';

export function logTestResult(
  contractName: string,
  circuitName: string,
  txId: string,
  blockHeight: number | string,
  status: 'PASS' | 'FAIL',
  details?: string,
) {
  const logDir = path.resolve(__dirname, '..', 'test-results');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = path.join(logDir, TEST_LOG_FILE_NAME);
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${contractName}.${circuitName} | tx: ${txId} | block: ${blockHeight} | ${status}${details ? ` | ${details}` : ''}\n`;

  fs.appendFileSync(logFile, line);
  console.log(`  📝 Logged: ${status} — ${contractName}.${circuitName}`);
}
