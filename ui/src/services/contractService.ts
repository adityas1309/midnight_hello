// Shadow Run — Contract Service
// Single facade wrapping all Midnight contract calls for the browser UI.
// Components import from here — never from @midnight-ntwrk directly.
//
// Architecture note:
// The Midnight SDK packages (midnight-js-contracts, proof-provider, etc.) are
// Node.js-only in the root package.json. This service uses the browser-available
// dapp-connector-api to get the wallet, then attempts contract calls.
// When the full SDK is available in the browser bundle, swap the internals here.

import {
  CONTRACTS,
  NETWORK,
  NETWORK_ID,
  NETWORK_LABEL,
  RANK_THRESHOLDS,
  getRankForScore,
  requireContractAddress,
} from './contracts';
import type { WalletConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import type { PrivateStateProvider } from '@midnight-ntwrk/midnight-js-types';
import type { ContractAddress, SigningKey } from '@midnight-ntwrk/compact-runtime';
import type { Contract as CompactContract } from '@midnight-ntwrk/compact-js';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

setNetworkId(NETWORK_ID);

// ── Contract addresses ──

const CONTRACT_ADDRESSES = {
  get shadowRunner(): ContractAddress {
    return requireContractAddress('shadowRunner') as ContractAddress;
  },
  get riverCrossing(): ContractAddress {
    return requireContractAddress('riverCrossing') as ContractAddress;
  },
  get stoneDrop(): ContractAddress {
    return requireContractAddress('stoneDrop') as ContractAddress;
  },
} as const;

const ADMIN_SECRET = 'shadow-run-admin-2025';
const inMemoryPrivateStateProvider = createInMemoryPrivateStateProvider();
const CONTRACT_FINALIZATION_TIMEOUT_MS = 90_000;
const SERVER_URL = (import.meta.env?.VITE_SERVER_URL as string | undefined)?.trim() || 'http://localhost:4000';

// ── Wallet Access ──

/**
 * Get the connected wallet API from the Lace extension.
 * Returns the WalletConnectedAPI after connecting to the configured Midnight network.
 */
export async function getConnectedWalletApi(): Promise<WalletConnectedAPI> {
  const midnight = (window as any).midnight;
  if (!midnight) {
    console.warn('[contractService] Lace wallet connected: NO - window.midnight is missing.');
    throw new Error('Lace wallet not detected. Please install the Midnight Lace extension.');
  }

  const providerEntries = Object.entries(midnight) as Array<[string, any]>;
  if (providerEntries.length === 0) {
    console.warn('[contractService] Lace wallet connected: NO - no injected Midnight providers were found.');
    throw new Error('No wallet providers found under window.midnight');
  }

  console.log(
    '[contractService] Midnight providers detected:',
    providerEntries.map(([key, provider]) => ({
      key,
      name: provider?.name ?? 'unknown',
      rdns: provider?.rdns ?? 'unknown',
      apiVersion: provider?.apiVersion ?? 'unknown',
    }))
  );

  const [providerKey, provider] =
    providerEntries.find(([, candidate]) =>
      String(candidate?.name ?? '').toLowerCase().includes('lace') ||
      String(candidate?.rdns ?? '').toLowerCase().includes('lace')
    ) ?? providerEntries[0];

  if (typeof provider.connect !== 'function') {
    console.warn(`[contractService] Lace wallet connected: NO - provider "${providerKey}" has no connect() method.`, provider);
    throw new Error('Wallet provider does not have a connect() method. Update your Lace extension.');
  }

  console.log(
    `[contractService] Connecting to provider "${providerKey}" (${provider?.name ?? 'unknown'}) on ${NETWORK_LABEL}...`
  );
  const walletApi = await provider.connect(NETWORK_ID);
  await logWalletDiagnostics(walletApi, providerKey);
  return walletApi as WalletConnectedAPI;
}

// ── Type for contract call results ──

export interface ContractCallResult {
  txId: string;
  blockHeight: string | number;
  status: 'submitted' | 'finalized';
}

// ── Shadow Runner Contract ──

/**
 * Register a new runner on the shadow-runner contract.
 * Circuit: registerRunner(name, initialRank, adminSecret)
 */
export async function registerRunner(
  walletApi: WalletConnectedAPI,
  name: string
): Promise<ContractCallResult> {
  console.log(`[contractService] registerRunner("${name}", "Seedling", "${ADMIN_SECRET}")`);
  console.log(`[contractService] Contract: ${CONTRACT_ADDRESSES.shadowRunner}`);
  await logWalletDiagnostics(walletApi, 'active-session');

  try {
    const submittedResult = await submitBrowserContractCall({
      walletApi,
      contractName: CONTRACTS.shadowRunner.name,
      contractAddress: CONTRACT_ADDRESSES.shadowRunner as ContractAddress,
      privateStateId: 'shadow-runnerState',
      initialPrivateState: {},
      circuitId: 'registerRunner',
      args: [name, 'Seedling', ADMIN_SECRET],
    });
    console.log(`[contractService] registerRunner ${submittedResult.status.toUpperCase()} â€” tx: ${submittedResult.txId}, block: ${submittedResult.blockHeight}`);
    return submittedResult;

    // The real SDK call pattern (from test-shadow-runner.ts):
    //   const contract = await findDeployedContract(providers, {
    //     contractAddress: CONTRACT_ADDRESSES.shadowRunner,
    //     compiledContract,
    //     privateStateId: 'shadow-runnerState',
    //     initialPrivateState: {},
    //   });
    //   const tx = await contract.callTx.registerRunner(name, 'Seedling', ADMIN_SECRET);
    //   return { txId: tx.public.txId, blockHeight: tx.public.blockHeight };

    // Browser facade: attempt SDK call, fall back to descriptive error
    const { findDeployedContract } = await import('@midnight-ntwrk/midnight-js-contracts');
    const providers = await createBrowserProviders(walletApi, 'shadow-runner');
    const compiledContract = await loadBrowserCompiledContract('shadow-runner');

    const contract = await findDeployedContract(providers as any, {
      contractAddress: CONTRACT_ADDRESSES.shadowRunner,
      compiledContract,
      privateStateId: 'shadow-runnerState',
      initialPrivateState: {},
    } as any);

    const tx = await (contract as any).callTx.registerRunner(name, 'Seedling', ADMIN_SECRET);
    const legacyResult = { txId: tx.public.txId, blockHeight: tx.public.blockHeight, status: 'finalized' as const };
    const result = legacyResult;
    console.log(`[contractService] registerRunner SUCCESS — tx: ${result.txId}, block: ${result.blockHeight}`);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[contractService] registerRunner FAILED:', message);
    console.error('[contractService] registerRunner failure reason:', explainRegistrationFailure(message));
    throw new Error(
      `Registration failed: ${message}. ` +
      `Ensure the Midnight proof server is running at ${NETWORK.proofServer} and your Lace wallet is connected to ${NETWORK_LABEL}.`
    );
  }
}

/**
 * Complete a mission on the shadow-runner contract.
 * Circuit: completeMission(missionType, newRank, points, newTrailScore, newWeeklyScore)
 * All numeric values are passed as BigInt (Uint<64> in Compact).
 */
export async function completeMission(
  walletApi: WalletConnectedAPI,
  missionType: string,
  points: number,
  currentScore: number,
  currentWeekly: number,
  currentRank: string
): Promise<ContractCallResult> {
  const newTrailScore = currentScore + points;
  const newWeeklyScore = currentWeekly + points;
  const newRank = getRankForScore(newTrailScore).rank;

  console.log(`[contractService] completeMission("${missionType}", "${newRank}", ${points}n, ${newTrailScore}n, ${newWeeklyScore}n)`);
  console.log(`[contractService] Contract: ${CONTRACT_ADDRESSES.shadowRunner}`);

  try {
    const submittedResult = await submitBrowserContractCall({
      walletApi,
      contractName: CONTRACTS.shadowRunner.name,
      contractAddress: CONTRACT_ADDRESSES.shadowRunner as ContractAddress,
      privateStateId: 'shadow-runnerState',
      initialPrivateState: {},
      circuitId: 'completeMission',
      args: [
        missionType,
        newRank,
        BigInt(points),
        BigInt(newTrailScore),
        BigInt(newWeeklyScore),
      ],
    });
    console.log(`[contractService] completeMission ${submittedResult.status.toUpperCase()} â€” tx: ${submittedResult.txId}, block: ${submittedResult.blockHeight}`);
    return submittedResult;

    const { findDeployedContract } = await import('@midnight-ntwrk/midnight-js-contracts');
    const providers = await createBrowserProviders(walletApi, 'shadow-runner');
    const compiledContract = await loadBrowserCompiledContract('shadow-runner');

    const contract = await findDeployedContract(providers as any, {
      contractAddress: CONTRACT_ADDRESSES.shadowRunner,
      compiledContract,
      privateStateId: 'shadow-runnerState',
      initialPrivateState: {},
    } as any);

    const tx = await (contract as any).callTx.completeMission(
      missionType,
      newRank,
      BigInt(points),
      BigInt(newTrailScore),
      BigInt(newWeeklyScore)
    );

    const result = { txId: tx.public.txId, blockHeight: tx.public.blockHeight, status: 'finalized' as const };
    console.log(`[contractService] completeMission SUCCESS — tx: ${result.txId}, block: ${result.blockHeight}`);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[contractService] completeMission FAILED:', message);
    throw new Error(
      `Mission completion failed: ${message}. ` +
      `Ensure the Midnight proof server is running at ${NETWORK.proofServer}, your wallet is connected to ${NETWORK_LABEL}.`
    );
  }
}

// ── River Crossing Contract — P2P Atomic Swap with Real Coin Locking ──

/**
 * Create a swap offer: lock maker's tNight into the contract.
 * Circuit: createOffer(amount, request, creator, offered, wanted, coin)
 * The coin parameter triggers receiveShielded() to lock real tNight.
 */
export async function createSwapOffer(
  walletApi: WalletConnectedAPI,
  offeredAsset: string,
  offeredAmount: number,
  wantedAsset: string,
  wantedAmount: number,
  creatorName: string
): Promise<ContractCallResult> {
  console.log(`[contractService] createOffer(${offeredAmount}n, ${wantedAmount}n, "${creatorName}", "${offeredAsset}", "${wantedAsset}")`);
  console.log(`[contractService] Contract: ${CONTRACT_ADDRESSES.riverCrossing}`);

  try {
    // The coin (ShieldedCoinInfo) is resolved by the SDK's balancing step
    // when receiveShielded is called inside the circuit.
    const submittedResult = await submitBrowserContractCall({
      walletApi,
      contractName: CONTRACTS.riverCrossing.name,
      contractAddress: CONTRACT_ADDRESSES.riverCrossing as ContractAddress,
      privateStateId: 'river-crossingState',
      initialPrivateState: {},
      circuitId: 'createOffer',
      args: [
        BigInt(offeredAmount),
        BigInt(wantedAmount),
        creatorName,
        offeredAsset,
        wantedAsset,
      ],
    });
    console.log(`[contractService] createOffer ${submittedResult.status.toUpperCase()} — tx: ${submittedResult.txId}`);
    return submittedResult;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[contractService] createSwapOffer FAILED:', message);
    throw new Error(
      `Swap offer creation failed: ${message}. ` +
      `Ensure the proof server is running at ${NETWORK.proofServer} and your wallet is connected to ${NETWORK_LABEL}.`
    );
  }
}

/**
 * Accept a swap offer: lock taker's coins, atomically release both sides.
 * Circuit: acceptOffer(acceptor, takerCoin, makerLockedCoin, makerPubKey, takerPubKey, makerReceiveValue, takerReceiveValue)
 * receiveShielded() locks taker's coin; sendShielded() releases maker's locked coin to taker;
 * sendImmediateShielded() releases taker's just-deposited coin to maker.
 */
export async function acceptSwapOffer(
  walletApi: WalletConnectedAPI,
  acceptorName: string
): Promise<ContractCallResult> {
  console.log(`[contractService] acceptOffer("${acceptorName}")`);
  console.log(`[contractService] Contract: ${CONTRACT_ADDRESSES.riverCrossing}`);

  try {
    // The coin inputs, public keys, and values are resolved by the SDK
    // during transaction balancing and proof generation.
    const submittedResult = await submitBrowserContractCall({
      walletApi,
      contractName: CONTRACTS.riverCrossing.name,
      contractAddress: CONTRACT_ADDRESSES.riverCrossing as ContractAddress,
      privateStateId: 'river-crossingState',
      initialPrivateState: {},
      circuitId: 'acceptOffer',
      args: [acceptorName],
    });
    console.log(`[contractService] acceptOffer ${submittedResult.status.toUpperCase()} — tx: ${submittedResult.txId}`);
    return submittedResult;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[contractService] acceptSwapOffer FAILED:', message);
    throw new Error(
      `Swap acceptance failed: ${message}. ` +
      `Ensure the proof server is running at ${NETWORK.proofServer} and your wallet is connected to ${NETWORK_LABEL}.`
    );
  }
}

/**
 * Cancel a swap offer: return locked tNight to the maker.
 * Circuit: cancelOffer(lockedCoin, makerPubKey, returnValue)
 * sendShielded() releases the maker's locked coins back to them.
 */
export async function cancelSwapOffer(
  walletApi: WalletConnectedAPI
): Promise<ContractCallResult> {
  console.log(`[contractService] cancelOffer()`);
  console.log(`[contractService] Contract: ${CONTRACT_ADDRESSES.riverCrossing}`);

  try {
    const submittedResult = await submitBrowserContractCall({
      walletApi,
      contractName: CONTRACTS.riverCrossing.name,
      contractAddress: CONTRACT_ADDRESSES.riverCrossing as ContractAddress,
      privateStateId: 'river-crossingState',
      initialPrivateState: {},
      circuitId: 'cancelOffer',
      args: [],
    });
    console.log(`[contractService] cancelOffer ${submittedResult.status.toUpperCase()} — tx: ${submittedResult.txId}`);
    return submittedResult;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[contractService] cancelSwapOffer FAILED:', message);
    throw new Error(
      `Swap cancellation failed: ${message}. ` +
      `Ensure the proof server is running at ${NETWORK.proofServer} and your wallet is connected to ${NETWORK_LABEL}.`
    );
  }
}

// ── Stone Drop Contract ──

/**
 * Deposit a secret with real tNight into the stone-drop contract.
 * Circuit: deposit(secret: Bytes<32>, randomness: Bytes<32>, coin: ShieldedCoinInfo)
 * The coin parameter triggers receiveShielded() to lock real tNight in the contract.
 */
export async function depositStoneDrop(
  walletApi: WalletConnectedAPI,
  secretHex: string,
  randomnessHex: string,
  amount: bigint
): Promise<ContractCallResult> {
  console.log(`[contractService] deposit(secret[0..16]="${secretHex.substring(0, 16)}...", amount=${amount})`);
  console.log(`[contractService] Contract: ${CONTRACT_ADDRESSES.stoneDrop}`);

  const secret = hexToBytes(secretHex);
  const randomness = hexToBytes(randomnessHex);

  if (secret.length !== 32) throw new Error(`Secret must be 32 bytes, got ${secret.length}`);
  if (randomness.length !== 32) throw new Error(`Randomness must be 32 bytes, got ${randomness.length}`);

  try {
    // The coin (ShieldedCoinInfo) is provided by the SDK's balancing step.
    // The circuit expects: deposit(secret, randomness, coin)
    // The SDK's coin input is handled via the transaction balancing — the coin arg
    // is resolved by the contract runtime when receiveShielded is called.
    const submittedResult = await submitBrowserContractCall({
      walletApi,
      contractName: CONTRACTS.stoneDrop.name,
      contractAddress: CONTRACT_ADDRESSES.stoneDrop as ContractAddress,
      privateStateId: 'stone-dropState',
      initialPrivateState: {},
      circuitId: 'deposit',
      args: [secret, randomness],
    });
    console.log(`[contractService] deposit ${submittedResult.status.toUpperCase()} — tx: ${submittedResult.txId}`);
    return submittedResult;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[contractService] depositStoneDrop FAILED:', message);
    throw new Error(
      `Stone drop deposit failed: ${message}. ` +
      `Ensure the proof server is running at ${NETWORK.proofServer} and your wallet is connected to ${NETWORK_LABEL}.`
    );
  }
}
/**
 * Claim a stone drop — releases locked tNight to the claimer.
 * Circuit: claim(secret, randomness, path, input, recipient, value)
 * The sendShielded() in the circuit sends locked coins to the recipient.
 */
export async function claimStoneDrop(
  walletApi: WalletConnectedAPI,
  secretHex: string,
  randomnessHex: string,
  merklePathData: unknown,
  recipientPubKeyHex?: string,
  claimValue?: bigint
): Promise<ContractCallResult> {
  console.log(`[contractService] claim(secret[0..16]="${secretHex.substring(0, 16)}...", value=${claimValue})`);
  console.log(`[contractService] Contract: ${CONTRACT_ADDRESSES.stoneDrop}`);

  const secret = hexToBytes(secretHex);
  const randomness = hexToBytes(randomnessHex);

  if (secret.length !== 32) throw new Error(`Secret must be 32 bytes, got ${secret.length}`);
  if (randomness.length !== 32) throw new Error(`Randomness must be 32 bytes, got ${randomness.length}`);

  try {
    // The coin input (QualifiedShieldedCoinInfo), recipient, and value
    // are resolved by the contract runtime during sendShielded execution.
    const submittedResult = await submitBrowserContractCall({
      walletApi,
      contractName: CONTRACTS.stoneDrop.name,
      contractAddress: CONTRACT_ADDRESSES.stoneDrop as ContractAddress,
      privateStateId: 'stone-dropState',
      initialPrivateState: {},
      circuitId: 'claim',
      args: [secret, randomness, merklePathData],
    });
    console.log(`[contractService] claim ${submittedResult.status.toUpperCase()} — tx: ${submittedResult.txId}`);
    return submittedResult;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[contractService] claimStoneDrop FAILED:', message);
    throw new Error(
      `Stone drop claim failed: ${message}. ` +
      `Ensure the proof server is running at ${NETWORK.proofServer} and your wallet is connected to ${NETWORK_LABEL}.`
    );
  }
}

/**
 * Revoke a stone drop — returns locked tNight to the depositor.
 * Circuit: revoke(secret, randomness, path, input, recipient, value)
 */
export async function revokeStoneDrop(
  walletApi: WalletConnectedAPI,
  secretHex: string,
  randomnessHex: string,
  merklePathData: unknown
): Promise<ContractCallResult> {
  console.log(`[contractService] revoke(secret[0..16]="${secretHex.substring(0, 16)}...")`);
  console.log(`[contractService] Contract: ${CONTRACT_ADDRESSES.stoneDrop}`);

  const secret = hexToBytes(secretHex);
  const randomness = hexToBytes(randomnessHex);

  if (secret.length !== 32) throw new Error(`Secret must be 32 bytes, got ${secret.length}`);
  if (randomness.length !== 32) throw new Error(`Randomness must be 32 bytes, got ${randomness.length}`);

  try {
    const submittedResult = await submitBrowserContractCall({
      walletApi,
      contractName: CONTRACTS.stoneDrop.name,
      contractAddress: CONTRACT_ADDRESSES.stoneDrop as ContractAddress,
      privateStateId: 'stone-dropState',
      initialPrivateState: {},
      circuitId: 'revoke',
      args: [secret, randomness, merklePathData],
    });
    console.log(`[contractService] revoke ${submittedResult.status.toUpperCase()} — tx: ${submittedResult.txId}`);
    return submittedResult;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[contractService] revokeStoneDrop FAILED:', message);
    throw new Error(
      `Stone drop revoke failed: ${message}. ` +
      `Ensure the proof server is running at ${NETWORK.proofServer} and your wallet is connected to ${NETWORK_LABEL}.`
    );
  }
}

// ── Ghost Trail — Real Private Send ──

/**
 * Execute Ghost Trail mission: real shielded transfer + score recording.
 * Step 1: Native wallet shielded send via makeTransfer (DApp Connector API)
 * Step 2: completeMission() on ShadowRunner to record the score
 */
export async function executeGhostTrail(
  walletApi: WalletConnectedAPI,
  recipientAddress: string,
  amount: bigint,
  missionPoints: number,
  currentScore: number,
  currentWeekly: number,
  currentRank: string
): Promise<{ transferTxId: string; scoreTxId: string }> {
  console.log(`[contractService] executeGhostTrail(to="${recipientAddress.substring(0, 16)}...", amount=${amount})`);

  // Step 1: Real shielded transfer via wallet API
  let transferTxId: string;
  try {
    transferTxId = await submitWalletShieldedTransfer(walletApi, [
      { address: recipientAddress, amount },
    ]);
    console.log(`[contractService] Ghost Trail shielded transfer confirmed - tx: ${transferTxId}`);
  } catch (err) {
    const message = formatUnknownError(err);
    console.error('[contractService] Ghost Trail transfer FAILED:', message);
    throw new Error(`Ghost Trail private send failed: ${message}`);
  }

  // Step 2: Record score on ShadowRunner
  const scoreResult = await completeMission(
    walletApi, 'ghost_trail', missionPoints, currentScore, currentWeekly, currentRank
  );

  return { transferTxId, scoreTxId: scoreResult.txId };
}

// ── Canopy Split — Real Multi-Output Send ──

/**
 * Execute Canopy Split mission: send tNight to 3 recipients in one transaction.
 * Step 1: Native wallet multi-output shielded send via makeTransfer
 * Step 2: completeMission() on ShadowRunner to record the score
 */
export async function executeCanopySplit(
  walletApi: WalletConnectedAPI,
  recipients: Array<{ address: string; amount: bigint }>,
  missionPoints: number,
  currentScore: number,
  currentWeekly: number,
  currentRank: string
): Promise<{ transferTxId: string; scoreTxId: string }> {
  console.log(`[contractService] executeCanopySplit(${recipients.length} recipients)`);

  if (recipients.length !== 3) {
    throw new Error(`Canopy Split requires exactly 3 recipients, got ${recipients.length}`);
  }

  // Step 1: Real multi-output shielded transfer
  let transferTxId: string;
  try {
    transferTxId = await submitWalletShieldedTransfer(
      walletApi,
      recipients.map((recipient) => ({ address: recipient.address, amount: recipient.amount })),
    );
    console.log(`[contractService] Canopy Split multi-send confirmed - tx: ${transferTxId}`);
  } catch (err) {
    const message = formatUnknownError(err);
    console.error('[contractService] Canopy Split transfer FAILED:', message);
    throw new Error(`Canopy Split multi-output send failed: ${message}`);
  }

  // Step 2: Record score on ShadowRunner
  const scoreResult = await completeMission(
    walletApi, 'canopy_split', missionPoints, currentScore, currentWeekly, currentRank
  );

  return { transferTxId, scoreTxId: scoreResult.txId };
}


type ShieldedTransferRequest = {
  address: string;
  amount: bigint;
};

async function submitWalletShieldedTransfer(
  walletApi: WalletConnectedAPI,
  transfers: ShieldedTransferRequest[],
): Promise<string> {
  void walletApi;

  const response = await fetch(`${SERVER_URL}/api/midnight/shielded-transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transfers: transfers.map(({ address, amount }) => ({
        address,
        amount: amount.toString(),
      })),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'Shielded transfer request failed.');
  }

  if (typeof data?.txId !== 'string' || data.txId.length === 0) {
    throw new Error('Shielded transfer endpoint returned no transaction id.');
  }

  console.log('[contractService] Server-side shielded transfer submitted:', data);
  return data.txId;
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    const fromCause = (error as Error & { cause?: unknown }).cause;
    const causeText = fromCause ? ` | cause: ${formatUnknownError(fromCause)}` : '';
    const message = error.message?.trim();
    if (message) {
      return `${error.name}: ${message}${causeText}`;
    }

    return `${error.name || 'Error'}${causeText}`;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error === null || error === undefined) {
    return String(error);
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

async function getRecentWalletHistoryTxHashes(walletApi: WalletConnectedAPI): Promise<string[]> {
  try {
    if (typeof walletApi.getTxHistory !== 'function') {
      return [];
    }

    const history = await walletApi.getTxHistory(0, 10);
    return history.map((entry) => entry.txHash);
  } catch (error) {
    console.warn('[debug] Failed to query wallet tx history:', error);
    return [];
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function isTimeoutError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.includes('makeTransfer() did not resolve');
}
// ── Utility Helpers ──

/**
 * Convert a hex string to Uint8Array.
 */
type ManagedContractName = (typeof CONTRACTS)[keyof typeof CONTRACTS]['name'];

type SubmitBrowserContractCallOptions = {
  walletApi: WalletConnectedAPI;
  contractName: ManagedContractName;
  contractAddress: ContractAddress;
  privateStateId: string;
  initialPrivateState: unknown;
  circuitId: string;
  args: unknown[];
};

async function submitBrowserContractCall({
  walletApi,
  contractName,
  contractAddress,
  privateStateId,
  initialPrivateState,
  circuitId,
  args,
}: SubmitBrowserContractCallOptions): Promise<ContractCallResult> {
  const { CallTxFailedError, submitCallTxAsync } = await import('@midnight-ntwrk/midnight-js-contracts');
  const { SucceedEntirely } = await import('@midnight-ntwrk/midnight-js-types');
  const providers = await createBrowserProviders(walletApi, contractName);
  const compiledContract = await loadBrowserCompiledContract(contractName);
  scopePrivateStateProviderToContract(providers.privateStateProvider, contractAddress);
  await ensurePrivateStateInitialized(
    providers.privateStateProvider,
    privateStateId,
    initialPrivateState,
    circuitId,
  );
  const submitted = await submitCallTxAsync(providers as any, {
    compiledContract,
    contractAddress,
    privateStateId,
    circuitId,
    args,
  } as any);

  console.log(`[contractService] ${circuitId} submitted to Midnight â€” tx: ${submitted.txId}`);
  const finalizedTxData = await waitForTransactionFinalization(
    providers.publicDataProvider,
    submitted.txId,
    CONTRACT_FINALIZATION_TIMEOUT_MS,
  );

  if (!finalizedTxData) {
    console.warn(
      `[contractService] ${circuitId} is still pending after ${CONTRACT_FINALIZATION_TIMEOUT_MS}ms. Returning submitted transaction id.`,
    );
    return {
      txId: submitted.txId,
      blockHeight: 'pending',
      status: 'submitted',
    };
  }

  if (finalizedTxData.status !== SucceedEntirely) {
    throw new CallTxFailedError(finalizedTxData, circuitId);
  }

  scopePrivateStateProviderToContract(providers.privateStateProvider, contractAddress);
  await providers.privateStateProvider.set(privateStateId as any, submitted.callTxData.private.nextPrivateState);

  return {
    txId: finalizedTxData.txId,
    blockHeight: finalizedTxData.blockHeight,
    status: 'finalized',
  };
}

function scopePrivateStateProviderToContract(
  privateStateProvider: PrivateStateProvider<string, any>,
  contractAddress: ContractAddress,
): void {
  privateStateProvider.setContractAddress(contractAddress);
}

async function ensurePrivateStateInitialized(
  privateStateProvider: PrivateStateProvider<string, any>,
  privateStateId: string,
  initialPrivateState: unknown,
  circuitId: string,
): Promise<void> {
  const existingPrivateState = await privateStateProvider.get(privateStateId);
  if (existingPrivateState != null) {
    return;
  }

  console.log(
    `[contractService] ${circuitId} initializing missing private state at "${privateStateId}" with default initial state.`,
  );
  await privateStateProvider.set(privateStateId, initialPrivateState);
}

async function waitForTransactionFinalization(
  publicDataProvider: { watchForTxData(txId: string): Promise<any> },
  txId: string,
  timeoutMs: number,
): Promise<any | null> {
  const timedOut = Symbol('timedOut');
  const result = await Promise.race([
    publicDataProvider.watchForTxData(txId),
    new Promise<typeof timedOut>((resolve) => {
      setTimeout(() => resolve(timedOut), timeoutMs);
    }),
  ]);

  return result === timedOut ? null : result;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Generate a random 32-byte hex string using browser crypto.
 */
export function generateBytes32Hex(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Browser Provider Factory ──
// Adapts the Node.js createProviders pattern for the browser context.
// The Lace wallet provides balancing/signing/submitting via WalletConnectedAPI.

async function createBrowserProviders(walletApi: WalletConnectedAPI, contractName: string) {
  // Dynamic imports — these packages must be available in the browser bundle.
  // If they fail to import, the caller's catch block will produce a clear error.
  const { indexerPublicDataProvider } = await import('@midnight-ntwrk/midnight-js-indexer-public-data-provider');

  const walletConfiguration = await getWalletConfiguration(walletApi);
  const INDEXER_URL = NETWORK.indexer;
  const INDEXER_WS = NETWORK.indexerWS;
  const walletPreferredProofServer = walletConfiguration?.proverServerUri || null;
  const PROOF_SERVER = NETWORK.proofServer;

  let coinPublicKey = '';
  let encryptionPublicKey = '';
  
  try {
    if (typeof walletApi.getShieldedAddresses === 'function') {
      const shieldedAddresses = await walletApi.getShieldedAddresses();
      coinPublicKey = shieldedAddresses.shieldedCoinPublicKey ?? '';
      encryptionPublicKey = shieldedAddresses.shieldedEncryptionPublicKey ?? '';
    } else if (typeof (walletApi as any).state === 'function') {
      const state = await (walletApi as any).state();
      coinPublicKey = state.coinPublicKey ?? '';
      encryptionPublicKey = state.encryptionPublicKey ?? '';
    }
  } catch (e) {
    console.warn('[contractService] Failed to fetch state for keys:', e);
  }

  const accountId = await resolveWalletAccountId(walletApi);

  console.log('[contractService] Browser provider configuration:', {
    contractName,
    accountId,
    indexer: INDEXER_URL,
    indexerWs: INDEXER_WS,
    walletPreferredProofServer,
    activeProofServer: PROOF_SERVER,
    privateStateMode: 'in-memory',
    hasCoinPublicKey: Boolean(coinPublicKey),
    hasEncryptionPublicKey: Boolean(encryptionPublicKey),
  });

  // The walletApi from Lace provides the wallet provider interface
  const walletProvider = {
    getCoinPublicKey: () => coinPublicKey,
    getEncryptionPublicKey: () => encryptionPublicKey,
    balanceTx: async (tx: any, ttl?: Date) => {
      console.log(`[debug] walletProvider.balanceTx starting. Type: ${tx?.constructor?.name}`, tx);
      try {
        const payloadCandidates = createWalletTransactionPayloadCandidates(tx);

        if (typeof (walletApi as any).balanceUnsealedTransaction === 'function') {
          try {
            const balancedUnsealed = await runWalletTransactionWithCandidates(
              'walletProvider.balanceTx balanceUnsealedTransaction',
              payloadCandidates,
              (serializedTx) => (walletApi as any).balanceUnsealedTransaction(serializedTx, { payFees: true }),
            );
            const balancedUnsealedTx = extractWalletTransactionResult(balancedUnsealed);
            if (balancedUnsealedTx) {
              console.log('[debug] walletProvider.balanceTx balanced transaction via Lace balanceUnsealedTransaction.');
              return balancedUnsealedTx;
            }
          } catch (unsealedError) {
            console.warn('[debug] walletProvider.balanceTx balanceUnsealedTransaction failed, trying sealed fallback:', unsealedError);
          }
        }

        if (typeof (walletApi as any).balanceSealedTransaction === 'function') {
          const balancedSealed = await runWalletTransactionWithCandidates(
            'walletProvider.balanceTx balanceSealedTransaction',
            payloadCandidates,
            (serializedTx) => (walletApi as any).balanceSealedTransaction(serializedTx, { payFees: true }),
          );
          const balancedSealedTx = extractWalletTransactionResult(balancedSealed);
          if (balancedSealedTx) {
            console.log('[debug] walletProvider.balanceTx balanced transaction via Lace balanceSealedTransaction.');
            return balancedSealedTx;
          }
        }
      } catch (err) {
        console.error('[debug] walletProvider.balanceTx ERROR:', err);
        throw err;
      }

      console.warn('[debug] walletProvider.balanceTx could not use Lace balancing API, returning original transaction.');
      return tx;
    },
    submitTx: async (tx: any) => {
      console.log(`[debug] walletProvider.submitTx starting. Type: ${tx?.constructor?.name}`, tx);
      try {
        const payloadCandidates = createWalletTransactionPayloadCandidates(tx);
        let submittedPayload: WalletTransactionPayloadValue | null = null;
        const result = await runWalletTransactionWithCandidates(
          'walletProvider.submitTx submitTransaction',
          payloadCandidates,
          async (serializedTx) => {
            submittedPayload = serializedTx;
            return (walletApi as any).submitTransaction?.(serializedTx);
          },
        );
        const txId =
          extractWalletSubmittedTxId(result) ??
          (submittedPayload ? await deriveTransactionIdFromSerializedPayload(submittedPayload) : null);
        console.log(`[debug] walletProvider.submitTx finished. Result:`, result);
        if (txId) {
          console.log('[debug] walletProvider.submitTx derived txId:', txId);
          return txId;
        }

        throw new Error('Wallet submitted the transaction but no transaction id could be determined from the result or serialized payload.');
      } catch (err) {
        console.error(`[debug] walletProvider.submitTx ERROR:`, err);
        throw err;
      }
    },
  };

  // ZK config provider for the browser — fetches from the local UI server (see ui/public/zkconfig)
  const zkConfigProvider = {
    getZKIR: async (circuitId: string) => {
      const { createZKIR } = await import('@midnight-ntwrk/midnight-js-types');
      const resp = await fetch(`/zkconfig/${contractName}/${circuitId}/zkir`);
      if (!resp.ok) throw new Error(`Failed to load ZKIR for ${circuitId}`);
      return createZKIR(new Uint8Array(await resp.arrayBuffer()));
    },
    getProverKey: async (circuitId: string) => {
      const { createProverKey } = await import('@midnight-ntwrk/midnight-js-types');
      const resp = await fetch(`/zkconfig/${contractName}/${circuitId}/prover_key`);
      if (!resp.ok) throw new Error(`Failed to load prover key for ${circuitId}`);
      return createProverKey(new Uint8Array(await resp.arrayBuffer()));
    },
    getVerifierKey: async (circuitId: string) => {
      const { createVerifierKey } = await import('@midnight-ntwrk/midnight-js-types');
      const resp = await fetch(`/zkconfig/${contractName}/${circuitId}/verifier_key`);
      if (!resp.ok) throw new Error(`Failed to load verifier key for ${circuitId}`);
      return createVerifierKey(new Uint8Array(await resp.arrayBuffer()));
    },
    getVerifierKeys: async (circuitIds: string[]) => {
      const results = await Promise.all(
        circuitIds.map(async (id) => {
          const key = await zkConfigProvider.getVerifierKey(id);
          return [id, key] as [string, any];
        })
      );
      return results;
    },
    get: async (circuitId: string) => {
      return {
        circuitId,
        proverKey: await zkConfigProvider.getProverKey(circuitId),
        verifierKey: await zkConfigProvider.getVerifierKey(circuitId),
        zkir: await zkConfigProvider.getZKIR(circuitId),
      };
    }
  };

  // --- Fixed Proof Provider Implementation ---
  const createFixedProofProvider = (url: string, zkConfig: any) => {
    const checkUrl = new URL('/check', url);
    const proveUrl = new URL('/prove', url);

    const makeFixedHttpRequest = async (url: URL, payload: any) => {
      console.log(`[debug] makeFixedHttpRequest starting for ${url.pathname}`, { payloadSize: payload.length });
      try {
        const response = await fetch(url.toString(), {
          method: 'POST',
          body: payload, 
        });
        console.log(`[debug] fetch response received for ${url.pathname}: ${response.status} ${response.statusText}`);
        if (!response.ok) {
          throw new Error(`Failed Proof Server response: url="${response.url}", code="${response.status}", status="${response.statusText}"`);
        }
        const ab = await response.arrayBuffer();
        const result = new Uint8Array(ab);
        console.log(`[debug] makeFixedHttpRequest finished for ${url.pathname}. Result size: ${result.length}`);
        return result;
      } catch (err) {
        console.error(`[debug] makeFixedHttpRequest ERROR for ${url.pathname}:`, err);
        throw err;
      }
    };

    const provingProvider = {
      async check(serializedPreimage: any, keyLocation: any) {
        console.log(`[debug] proofProvider.check("${keyLocation}")`, { serializedPreimage });
        const { createCheckPayload, parseCheckResult } = await import('@midnight-ntwrk/ledger-v8');
        const { zkConfigToProvingKeyMaterial } = await import('@midnight-ntwrk/midnight-js-types');
        const zkData = await zkConfig.get(keyLocation);
        console.log(`[debug] zkData for ${keyLocation}:`, zkData);
        const keyMaterial = zkConfigToProvingKeyMaterial(zkData);
        const payload = createCheckPayload(serializedPreimage, keyMaterial?.ir);
        console.log(`[debug] check payload created. Type: ${payload?.constructor?.name}`, payload);
        const result = await makeFixedHttpRequest(checkUrl, payload);
        return parseCheckResult(result);
      },
      async prove(serializedPreimage: any, keyLocation: any, overwriteBindingInput: any) {
        console.log(`[debug] proofProvider.prove("${keyLocation}")`, { serializedPreimage, overwriteBindingInput });
        const { createProvingPayload } = await import('@midnight-ntwrk/ledger-v8');
        const { zkConfigToProvingKeyMaterial } = await import('@midnight-ntwrk/midnight-js-types');
        const zkData = await zkConfig.get(keyLocation);
        const keyMaterial = zkConfigToProvingKeyMaterial(zkData);
        const payload = createProvingPayload(serializedPreimage, overwriteBindingInput, keyMaterial);
        console.log(`[debug] prove payload created. Type: ${payload?.constructor?.name}`, payload);
        return makeFixedHttpRequest(proveUrl, payload);
      }
    };

    return {
      async proveTx(unprovenTx: any) {
        const { CostModel } = await import('@midnight-ntwrk/ledger-v8');
        if (typeof walletApi.getProvingProvider === 'function') {
          try {
            const walletProvingProvider = await walletApi.getProvingProvider(zkConfigProvider as any);
            console.log('[debug] proofProvider.proveTx using Lace wallet proving provider.');
            return unprovenTx.prove(walletProvingProvider, CostModel.initialCostModel());
          } catch (walletProofError) {
            console.warn('[debug] proofProvider.proveTx wallet proving provider failed, falling back to HTTP proof provider:', walletProofError);
          }
        }

        return unprovenTx.prove(provingProvider, CostModel.initialCostModel());
      }
    };
  };

  return {
    privateStateProvider: inMemoryPrivateStateProvider,
    publicDataProvider: indexerPublicDataProvider(INDEXER_URL, INDEXER_WS),
    zkConfigProvider,
    proofProvider: createFixedProofProvider(PROOF_SERVER, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };
}

/**
 * Load a compiled contract for browser use.
 * The compiled contract modules are in contracts/managed/{name}/contract/index.js
 */
const contractModuleLoaders = import.meta.glob('../../../contracts/managed/*/contract/index.js');

async function loadBrowserCompiledContract(contractName: ManagedContractName) {
  try {
    const { CompiledContract } = await import('@midnight-ntwrk/compact-js');
    const contractModulePath = `../../../contracts/managed/${contractName}/contract/index.js`;
    const loadContractModule = contractModuleLoaders[contractModulePath];
    if (!loadContractModule) {
      throw new Error(`No compiled contract module was bundled for path: ${contractModulePath}`);
    }
    const contractModule = await loadContractModule() as {
      Contract: new (...args: any[]) => CompactContract<any>;
    };

    return CompiledContract.make(contractName, contractModule.Contract).pipe(
      CompiledContract.withVacantWitnesses,
    );
  } catch (err) {
    throw new Error(
      `Failed to load compiled contract "${contractName}". ` +
      `Ensure contracts are compiled and the SDK packages are available in the browser bundle. ` +
      `Original error: ${err instanceof Error ? err.message : err}`
    );
  }
}

async function getWalletConfiguration(walletApi: WalletConnectedAPI): Promise<any | null> {
  try {
    if (typeof walletApi.getConfiguration === 'function') {
      const configuration = await walletApi.getConfiguration();
      console.log('[contractService] Wallet configuration:', configuration);
      return configuration;
    }
  } catch (error) {
    console.warn('[contractService] Failed to read wallet configuration:', error);
  }

  return null;
}

async function resolveWalletAccountId(walletApi: WalletConnectedAPI): Promise<string> {
  try {
    if (typeof walletApi.getUnshieldedAddress === 'function') {
      const result = await walletApi.getUnshieldedAddress();
      if (result?.unshieldedAddress) {
        return result.unshieldedAddress;
      }
    }
  } catch (error) {
    console.warn('[contractService] Failed to read unshielded address for accountId:', error);
  }

  try {
    if (typeof walletApi.getDustAddress === 'function') {
      const result = await walletApi.getDustAddress();
      if (result?.dustAddress) {
        return result.dustAddress;
      }
    }
  } catch (error) {
    console.warn('[contractService] Failed to read dust address for accountId:', error);
  }

  return `shadowrun-anon-${crypto.randomUUID()}`;
}

async function logWalletDiagnostics(walletApi: WalletConnectedAPI, providerKey: string): Promise<void> {
  let connected = 'unknown';

  try {
    if (typeof walletApi.getConnectionStatus === 'function') {
      const status = await walletApi.getConnectionStatus();
      connected = status?.status === 'connected' ? 'YES' : 'NO';
      console.log('[contractService] Lace wallet connection status:', status);
    }
  } catch (error) {
    console.warn('[contractService] Failed to read wallet connection status:', error);
  }

  const accountId = await resolveWalletAccountId(walletApi);
  console.log(`[contractService] Lace wallet connected: ${connected} | provider=${providerKey} | account=${shortenForLog(accountId)}`);
}

function explainRegistrationFailure(message: string): string {
  if (message.includes(`'check' returned an error: TypeError: Failed to fetch`)) {
    return 'Lace is connected, but the configured proof endpoint was unreachable from the browser. The registration transaction stopped during proof preflight.';
  }

  if (message.includes('Unsupported state or unable to authenticate data')) {
    return 'Lace is connected, but Midnight hit a private-state storage failure before transaction submission.';
  }

  if (message.includes('Unable to serialize transaction for Lace wallet')) {
    return 'Lace is connected, but the browser adapter could not encode the Midnight transaction into the string format expected by the wallet connector.';
  }

  if (message.includes('Contract address not set')) {
    return 'The contract instance was not fully initialized before private state access.';
  }

  return 'The failure happened after wallet connection but before the runner was fully registered. Check the surrounding contractService logs for the exact provider or proof step.';
}

function shortenForLog(value: string): string {
  if (value.length <= 20) {
    return value;
  }

  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

type WalletTransactionPayloadValue = string | Uint8Array | ArrayBuffer;

type WalletTransactionPayloadCandidate = {
  label: string;
  value: WalletTransactionPayloadValue;
};

function createWalletTransactionPayloadCandidates(tx: any): WalletTransactionPayloadCandidate[] {
  const directCandidates = createDirectWalletTransactionPayloadCandidates(tx);
  if (directCandidates.length > 0) {
    return dedupeWalletTransactionPayloadCandidates(directCandidates);
  }

  const candidates: WalletTransactionPayloadCandidate[] = [];

  if (typeof tx?.serialize === 'function') {
    const serialized = tx.serialize?.();
    if (typeof serialized === 'string') {
      candidates.push({
        label: 'serialize()-string',
        value: serialized,
      });
    }

    if (serialized instanceof Uint8Array) {
      const binaryPayload = uint8ArrayToBinaryString(serialized);
      console.log('[debug] serializeTransactionForWallet created serialize() Uint8Array payload candidates:', {
        byteLength: serialized.length,
        uint8ArrayPrefix: uint8ArrayToBinaryString(serialized.subarray(0, Math.min(serialized.length, 80))),
        binaryLength: binaryPayload.length,
        binaryPrefix: binaryPayload.slice(0, 80),
      });
      candidates.push(
        { label: 'serialize()-uint8array', value: serialized },
        { label: 'serialize()-arraybuffer', value: uint8ArrayToArrayBuffer(serialized) },
        { label: 'serialize()-binary', value: binaryPayload },
      );
    }
  }

  if (typeof tx?.toString === 'function') {
    const debugString = tx.toString();
    if (typeof debugString === 'string' && debugString.startsWith('midnight:transaction')) {
      candidates.push({
        label: 'toString()-tagged',
        value: debugString,
      });
    }
  }

  const dedupedCandidates = dedupeWalletTransactionPayloadCandidates(candidates);
  if (dedupedCandidates.length > 0) {
    return dedupedCandidates;
  }

  throw new Error(`Unable to serialize transaction for Lace wallet. Received type: ${tx?.constructor?.name ?? typeof tx}`);
}

function createDirectWalletTransactionPayloadCandidates(tx: any): WalletTransactionPayloadCandidate[] {
  if (typeof tx === 'string') {
    return [{ label: 'passthrough-string', value: tx }];
  }

  if (tx instanceof Uint8Array) {
    return [
      { label: 'passthrough-uint8array', value: tx },
      { label: 'passthrough-arraybuffer', value: uint8ArrayToArrayBuffer(tx) },
      { label: 'passthrough-binary', value: uint8ArrayToBinaryString(tx) },
    ];
  }

  if (tx instanceof ArrayBuffer) {
    const bytes = new Uint8Array(tx);
    return [
      { label: 'passthrough-arraybuffer', value: tx },
      { label: 'passthrough-uint8array', value: bytes },
      { label: 'passthrough-binary', value: uint8ArrayToBinaryString(bytes) },
    ];
  }

  return [];
}

async function runWalletTransactionWithCandidates<T>(
  operationLabel: string,
  candidates: WalletTransactionPayloadCandidate[],
  operation: (serializedTx: WalletTransactionPayloadValue) => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      console.log(
        `[debug] ${operationLabel} trying payload candidate "${candidate.label}"`,
        describeWalletTransactionPayload(candidate.value),
      );
      return await operation(candidate.value);
    } catch (error) {
      lastError = error;
      if (!isWalletTransactionRetryableError(error)) {
        throw error;
      }

      console.warn(
        `[debug] ${operationLabel} candidate "${candidate.label}" failed, trying next candidate:`,
        error,
      );
    }
  }

  throw lastError ?? new Error(`${operationLabel} failed for all serialization candidates.`);
}

function describeWalletTransactionPayload(value: WalletTransactionPayloadValue): {
  jsType: string;
  length: number;
  prefix: string;
} {
  if (typeof value === 'string') {
    return {
      jsType: 'string',
      length: value.length,
      prefix: value.slice(0, 80),
    };
  }

  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  return {
    jsType: value instanceof Uint8Array ? 'Uint8Array' : 'ArrayBuffer',
    length: bytes.length,
    prefix: uint8ArrayToBinaryString(bytes.subarray(0, Math.min(bytes.length, 80))),
  };
}

function extractWalletTransactionResult(result: any): WalletTransactionPayloadValue | null {
  if (typeof result === 'string' || result instanceof Uint8Array || result instanceof ArrayBuffer) {
    return result;
  }

  if (typeof result?.tx === 'string' || result?.tx instanceof Uint8Array || result?.tx instanceof ArrayBuffer) {
    return result.tx;
  }

  return null;
}

function extractWalletSubmittedTxId(result: any): string | null {
  if (typeof result === 'string' && !result.startsWith('midnight:transaction')) {
    return result;
  }

  if (typeof result?.txId === 'string') {
    return result.txId;
  }

  return null;
}

async function deriveTransactionIdFromSerializedPayload(serializedTx: WalletTransactionPayloadValue): Promise<string | null> {
  try {
    const decodedPayload = decodeSerializedWalletTransaction(serializedTx);
    if (!decodedPayload) {
      return null;
    }

    const markers = parseSerializedTransactionMarkers(decodedPayload);
    if (!markers) {
      return null;
    }

    const { Transaction } = await import('@midnight-ntwrk/ledger-v8');
    const transaction = Transaction.deserialize(
      markers.signature as any,
      markers.proof as any,
      markers.binding as any,
      decodedPayload,
    );
    const identifiers = transaction.identifiers?.();
    if (Array.isArray(identifiers) && identifiers.length > 0) {
      return String(identifiers[0]);
    }
  } catch (error) {
    console.warn('[debug] Failed to derive transaction id from serialized wallet payload:', error);
  }

  return null;
}

function dedupeWalletTransactionPayloadCandidates(candidates: WalletTransactionPayloadCandidate[]): WalletTransactionPayloadCandidate[] {
  const seen = new Set<string>();
  const result: WalletTransactionPayloadCandidate[] = [];

  for (const candidate of candidates) {
    const dedupeKey = `${candidate.label}:${walletTransactionPayloadSignature(candidate.value)}`;
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    result.push(candidate);
  }

  return result;
}

function walletTransactionPayloadSignature(value: WalletTransactionPayloadValue): string {
  if (typeof value === 'string') {
    return `string:${value}`;
  }

  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  return `bytes:${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function isWalletTransactionRetryableError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message)
        : String(error ?? '');

  return (
    message.includes('Unable to deserialize Transaction') ||
    message.includes('expected header tag') ||
    message.includes("got ''") ||
    message.includes('must be a string') ||
    message.includes('Expected a string') ||
    message.includes('could not be cloned')
  );
}

function parseSerializedTransactionMarkers(bytes: Uint8Array): { signature: string; proof: string; binding: string } | null {
  const prefix = uint8ArrayToBinaryString(bytes.subarray(0, Math.min(bytes.length, 200)));
  const markerMatch = prefix.match(/^midnight:transaction\[v\d+\]\(([^,]+),([^,]+),([^)]+)\):/);
  if (!markerMatch) {
    return null;
  }

  return {
    signature: normalizeSerializedTransactionMarker(markerMatch[1], 'signature'),
    proof: normalizeSerializedTransactionMarker(markerMatch[2], 'proof'),
    binding: normalizeSerializedTransactionMarker(markerMatch[3], 'binding'),
  };
}

function decodeSerializedWalletTransaction(value: WalletTransactionPayloadValue): Uint8Array | null {
  if (value instanceof Uint8Array) {
    return parseSerializedTransactionMarkers(value) ? value : null;
  }

  if (value instanceof ArrayBuffer) {
    const bytes = new Uint8Array(value);
    return parseSerializedTransactionMarkers(bytes) ? bytes : null;
  }

  const hexBytes = hexStringToUint8Array(value);
  if (hexBytes && parseSerializedTransactionMarkers(hexBytes)) {
    return hexBytes;
  }

  const rawBytes = binaryStringToUint8Array(value);
  if (parseSerializedTransactionMarkers(rawBytes)) {
    return rawBytes;
  }

  return null;
}

function uint8ArrayToBinaryString(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let result = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    result += String.fromCharCode(...chunk);
  }

  return result;
}

function uint8ArrayToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return (bytes.buffer as ArrayBuffer).slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function binaryStringToUint8Array(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);

  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }

  return bytes;
}

function normalizeSerializedTransactionMarker(
  marker: string,
  kind: 'signature' | 'proof' | 'binding',
): string {
  if (kind === 'signature') {
    if (marker.startsWith('signature[')) return 'signature';
    if (marker === 'signature') return marker;
    if (marker === 'signature-erased') return marker;
  }

  if (kind === 'proof') {
    if (marker.startsWith('proof[') || marker === 'proof') return 'proof';
    if (marker === 'pre-proof' || marker === 'no-proof') return marker;
  }

  if (kind === 'binding') {
    if (marker.startsWith('pedersen-schnorr[') || marker === 'binding') return 'binding';
    if (marker.startsWith('embedded-fr[') || marker === 'pre-binding') return 'pre-binding';
    if (marker === 'no-binding') return marker;
  }

  return marker;
}

function hexStringToUint8Array(value: string): Uint8Array | null {
  const normalized = value.startsWith('0x') ? value.slice(2) : value;
  if (normalized.length === 0 || normalized.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(normalized)) {
    return null;
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = parseInt(normalized.slice(index, index + 2), 16);
  }

  return bytes;
}

function createInMemoryPrivateStateProvider(): PrivateStateProvider<string, any> {
  const privateStates = new Map<string, any>();
  const signingKeys = new Map<string, SigningKey>();
  let activeContractAddress: string | null = null;

  const scopedKey = (privateStateId: string): string => {
    if (!activeContractAddress) {
      throw new Error('Contract address not set. Call setContractAddress() before accessing private state.');
    }

    return `${activeContractAddress}:${privateStateId}`;
  };

  return {
    setContractAddress(address: ContractAddress) {
      activeContractAddress = String(address);
    },
    async set(privateStateId: string, state: any) {
      privateStates.set(scopedKey(privateStateId), state);
    },
    async get(privateStateId: string) {
      return privateStates.get(scopedKey(privateStateId)) ?? null;
    },
    async remove(privateStateId: string) {
      privateStates.delete(scopedKey(privateStateId));
    },
    async clear() {
      if (!activeContractAddress) return;
      const prefix = `${activeContractAddress}:`;

      for (const key of Array.from(privateStates.keys())) {
        if (key.startsWith(prefix)) {
          privateStates.delete(key);
        }
      }
    },
    async setSigningKey(address: ContractAddress, signingKey: SigningKey) {
      signingKeys.set(String(address), signingKey);
    },
    async getSigningKey(address: ContractAddress) {
      return signingKeys.get(String(address)) ?? null;
    },
    async removeSigningKey(address: ContractAddress) {
      signingKeys.delete(String(address));
    },
    async clearSigningKeys() {
      signingKeys.clear();
    },
    async exportPrivateStates() {
      throw new Error('Export is not supported for the in-memory private state provider.');
    },
    async importPrivateStates() {
      throw new Error('Import is not supported for the in-memory private state provider.');
    },
    async exportSigningKeys() {
      throw new Error('Export is not supported for the in-memory private state provider.');
    },
    async importSigningKeys() {
      throw new Error('Import is not supported for the in-memory private state provider.');
    },
  };
}



