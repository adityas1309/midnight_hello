import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as Rx from 'rxjs';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { createShieldedCoinInfo, encodeQualifiedShieldedCoinInfo, encodeShieldedCoinInfo, nativeToken } from '@midnight-ntwrk/ledger-v8';
import {
  getSpendableShieldedCoin,
  NETWORK_ID,
  NETWORK_LABEL,
  TEST_LOG_FILE_NAME,
  TEST_SEED,
  createProviders,
  createWallet,
  fundShieldedFromGenesis,
  loadCompiledContractWithWitnesses,
  logTestResult,
  submitContractCallWithLocalState,
  waitForSync,
} from './utils.js';

const CONTRACT_NAME = 'river-crossing';
const OFFER_AMOUNT = 500n;
const REQUEST_AMOUNT = 250n;
const CANCEL_FEE_TOP_UP = 20_000_000n;

type RiverCrossingWitnessState = {
  offerCoin?: any;
  lockedCoin?: any;
  makerPubKey?: Uint8Array;
  priorContractOutputs?: any[];
  takerPubKey?: Uint8Array;
  zswapLocalState?: any;
};

function coinPublicKeyToBytes(coinPublicKey: { toHexString?: () => string } | string): Uint8Array {
  const hex = typeof coinPublicKey === 'string'
    ? coinPublicKey
    : coinPublicKey.toHexString?.() ?? '';
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex;
  return Buffer.from(normalized, 'hex');
}

async function getBalance(walletCtx: Awaited<ReturnType<typeof createWallet>>): Promise<bigint> {
  const state = await Rx.firstValueFrom(
    walletCtx.wallet.state().pipe(Rx.filter((s) => s.isSynced)),
  );
  const shieldedBalances = state.shielded?.balances ?? {};
  const totalShielded = Object.values(shieldedBalances).reduce(
    (sum: bigint, val: any) => sum + (typeof val === 'bigint' ? val : BigInt(val)),
    0n,
  );
  const unshieldedBalances = state.unshielded?.balances ?? {};
  const totalUnshielded = Object.values(unshieldedBalances).reduce(
    (sum: bigint, val: any) => sum + (typeof val === 'bigint' ? val : BigInt(val)),
    0n,
  );
  return totalShielded + totalUnshielded;
}

function createRiverCrossingWitnesses(state: RiverCrossingWitnessState, offerAmount: bigint, requestAmount: bigint) {
  const takerCoin = createShieldedCoinInfo(nativeToken().raw, requestAmount);

  return {
    get_offer_coin: (ctx: any) => {
      if (!state.offerCoin) throw new Error('Offer coin not prepared');
      return [ctx.privateState, encodeShieldedCoinInfo(state.offerCoin)];
    },
    get_taker_coin: (ctx: any) => [ctx.privateState, encodeShieldedCoinInfo(takerCoin)],
    get_maker_locked_coin: (ctx: any) => {
      if (!state.lockedCoin) throw new Error('Locked offer coin not recorded');
      return [ctx.privateState, encodeQualifiedShieldedCoinInfo(state.lockedCoin)];
    },
    get_maker_pubkey: (ctx: any) => {
      if (!state.makerPubKey) throw new Error('Maker pubkey not prepared');
      return [ctx.privateState, { bytes: state.makerPubKey }];
    },
    get_taker_pubkey: (ctx: any) => {
      if (!state.takerPubKey) throw new Error('Taker pubkey not prepared');
      return [ctx.privateState, { bytes: state.takerPubKey }];
    },
    get_maker_receive_value: (ctx: any) => [ctx.privateState, requestAmount],
    get_taker_receive_value: (ctx: any) => [ctx.privateState, offerAmount],
    get_cancel_coin: (ctx: any) => {
      if (!state.lockedCoin) throw new Error('Locked offer coin not recorded');
      return [ctx.privateState, encodeQualifiedShieldedCoinInfo(state.lockedCoin)];
    },
    get_cancel_pubkey: (ctx: any) => {
      if (!state.makerPubKey) throw new Error('Maker pubkey not prepared');
      return [ctx.privateState, { bytes: state.makerPubKey }];
    },
    get_cancel_value: (ctx: any) => [ctx.privateState, offerAmount],
  };
}

async function main() {
  console.log(`\n=== Test RiverCrossing (Real P2P Swap) on ${NETWORK_LABEL} ===\n`);

  const deploymentPath = `deployments/${CONTRACT_NAME}.json`;
  if (!fs.existsSync(deploymentPath)) {
    console.error('  No deployment found. Run: npm run deploy-river-crossing');
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
  if (deployment.network !== NETWORK_ID) {
    console.error(`  Deployment network mismatch. Found "${deployment.network}", expected "${NETWORK_ID}".`);
    process.exit(1);
  }
  console.log(`  Contract: ${deployment.contractAddress}\n`);

  console.log('--- Connecting ---\n');
  const walletCtx = await createWallet(TEST_SEED);
  console.log('  Syncing wallet...');
  await waitForSync(walletCtx);
  await fundShieldedFromGenesis(walletCtx, OFFER_AMOUNT);

  const syncedState = await waitForSync(walletCtx);
  const witnessState: RiverCrossingWitnessState = {
    makerPubKey: coinPublicKeyToBytes(syncedState.shielded.coinPublicKey),
    takerPubKey: coinPublicKeyToBytes(syncedState.shielded.coinPublicKey),
  };

  const witnesses = createRiverCrossingWitnesses(witnessState, OFFER_AMOUNT, REQUEST_AMOUNT);
  const { compiledContract } = await loadCompiledContractWithWitnesses(CONTRACT_NAME, witnesses);
  console.log('  Setting up providers...');
  let providers = await createProviders(walletCtx, CONTRACT_NAME);
  console.log('  Joining contract...');
  let contract = await findDeployedContract(providers as any, {
    contractAddress: deployment.contractAddress,
    compiledContract: compiledContract as any,
    privateStateId: `${CONTRACT_NAME}State`,
    initialPrivateState: {},
  } as any);
  console.log('  Connected.\n');

  let allPassed = true;

  console.log(`--- Test 1: createOffer(${OFFER_AMOUNT}, ${REQUEST_AMOUNT}, "RunnerAlpha", ...) ---\n`);
  try {
    const balanceBefore = await getBalance(walletCtx);
    console.log(`  Balance BEFORE createOffer: ${balanceBefore}`);
    const [preOfferZswapState] =
      (await providers.publicDataProvider.queryZSwapAndContractState(deployment.contractAddress)) ?? [];
    if (!preOfferZswapState) throw new Error('Could not read pre-offer zswap state');
    witnessState.offerCoin = await getSpendableShieldedCoin(walletCtx, OFFER_AMOUNT);
    if (!witnessState.offerCoin) throw new Error(`No shielded coin available with value >= ${OFFER_AMOUNT}`);

    console.log('  Calling createOffer (20-30 seconds)...');
    const tx1 = await contract.callTx.createOffer(OFFER_AMOUNT, REQUEST_AMOUNT, 'RunnerAlpha', 'tDUST', 'NIGHT');
    console.log(`  Transaction: ${tx1.public.txId}`);
    console.log(`  Block: ${tx1.public.blockHeight}`);

    await new Promise((resolve) => setTimeout(resolve, 5000));
    await waitForSync(walletCtx);
    const balanceAfter = await getBalance(walletCtx);
    const delta = balanceBefore - balanceAfter;
    console.log(`  Balance AFTER createOffer: ${balanceAfter}`);
    console.log(`  Locked delta: -${delta}\n`);

    const lockedOutputIndex = tx1.private.nextZswapLocalState.outputs.findIndex(
      ({ recipient }: any) => !recipient.is_left,
    );
    if (lockedOutputIndex >= 0) {
      const lockedOutput = tx1.private.nextZswapLocalState.outputs[lockedOutputIndex];
      const lockedIndex = preOfferZswapState.firstFree;
      witnessState.priorContractOutputs =
        (tx1.private.unprovenTx?.guaranteedOffer?.outputs ?? []).filter(
          (output: any) => String(output.contractAddress) === deployment.contractAddress,
        );
      witnessState.lockedCoin = {
        ...lockedOutput.coinInfo,
        mt_index: lockedIndex,
      };
      witnessState.zswapLocalState = {
        coinPublicKey: tx1.private.nextZswapLocalState.coinPublicKey,
        currentIndex: lockedIndex + 1n,
        inputs: [],
        outputs: [lockedOutput],
      };
    }

    const state1 = await providers.publicDataProvider.queryContractState(deployment.contractAddress);
    let offerActive = 0n;
    let offeredAmount = 0n;
    let requestedAmount = 0n;
    if (state1) {
      const { contractModule } = await loadCompiledContractWithWitnesses(CONTRACT_NAME, witnesses);
      const ledgerState = contractModule.ledger(state1.data);
      offerActive = BigInt(ledgerState.offerActive);
      offeredAmount = BigInt(ledgerState.offeredAmount);
      requestedAmount = BigInt(ledgerState.requestedAmount);
      console.log(`  Ledger - offerActive: "${ledgerState.offerActive}"`);
      console.log(`  Ledger - offeredAmount: ${ledgerState.offeredAmount}`);
      console.log(`  Ledger - requestedAmount: ${ledgerState.requestedAmount}\n`);
    }

    if (delta > 0n && witnessState.lockedCoin && offerActive === 1n && offeredAmount === OFFER_AMOUNT && requestedAmount === REQUEST_AMOUNT) {
      console.log('  PASS: real offer lock confirmed.\n');
      logTestResult(CONTRACT_NAME, 'createOffer', tx1.public.txId, tx1.public.blockHeight, 'PASS', `balance decreased by ${delta}`);
    } else {
      console.log('  FAIL: real offer lock was not fully observed.\n');
      logTestResult(
        CONTRACT_NAME,
        'createOffer',
        tx1.public.txId,
        tx1.public.blockHeight,
        'FAIL',
        `delta=${delta}, lockedCoin=${Boolean(witnessState.lockedCoin)}, offerActive=${offerActive}, offeredAmount=${offeredAmount}, requestedAmount=${requestedAmount}`,
      );
      allPassed = false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  FAIL: ${message}\n`);
    logTestResult(CONTRACT_NAME, 'createOffer', 'N/A', 'N/A', 'FAIL', message);
    allPassed = false;
  }

  console.log('--- Test 2: cancelOffer() ---\n');
  try {
    await fundShieldedFromGenesis(walletCtx, CANCEL_FEE_TOP_UP);
    providers = await createProviders(walletCtx, CONTRACT_NAME);
    contract = await findDeployedContract(providers as any, {
      contractAddress: deployment.contractAddress,
      compiledContract: compiledContract as any,
      privateStateId: `${CONTRACT_NAME}State`,
      initialPrivateState: {},
    } as any);

    const balanceBefore = await getBalance(walletCtx);
    console.log(`  Balance BEFORE cancelOffer: ${balanceBefore}`);
    if (!witnessState.lockedCoin) throw new Error('Locked offer coin was not captured from createOffer');
    if (!witnessState.zswapLocalState) throw new Error('Contract local zswap state was not captured from createOffer');
    const encodedCancelCoin = encodeQualifiedShieldedCoinInfo(witnessState.lockedCoin);
    console.log(`  Cancel coin value: ${encodedCancelCoin.value}`);
    console.log(`  Cancel coin nonce bytes: ${encodedCancelCoin.nonce?.length ?? 'undefined'}`);
    console.log(`  Cancel coin color bytes: ${encodedCancelCoin.color?.length ?? 'undefined'}`);
    console.log(`  Cancel pubkey bytes: ${witnessState.makerPubKey?.length ?? 'undefined'}`);

    console.log('  Calling cancelOffer (20-30 seconds)...');
    const tx2 = await submitContractCallWithLocalState(providers, {
      compiledContract: compiledContract as any,
      contractAddress: deployment.contractAddress,
      circuitId: 'cancelOffer',
      privateStateId: `${CONTRACT_NAME}State`,
      args: [],
      initialZswapLocalState: witnessState.zswapLocalState,
      priorContractOutputs: witnessState.priorContractOutputs,
    });
    console.log(`  Transaction: ${tx2.public.txId}`);
    console.log(`  Block: ${tx2.public.blockHeight}`);

    await new Promise((resolve) => setTimeout(resolve, 5000));
    await waitForSync(walletCtx);
    const balanceAfter = await getBalance(walletCtx);
    const returnDelta = balanceAfter - balanceBefore;
    console.log(`  Balance AFTER cancelOffer: ${balanceAfter}`);
    console.log(`  Returned: +${returnDelta}\n`);

    const finalCancelState = await providers.publicDataProvider.queryContractState(deployment.contractAddress);
    let offerStillActive = 1n;
    if (finalCancelState) {
      const { contractModule } = await loadCompiledContractWithWitnesses(CONTRACT_NAME, witnesses);
      const ledgerState = contractModule.ledger(finalCancelState.data);
      offerStillActive = BigInt(ledgerState.offerActive);
    }

    if (returnDelta > 0n && offerStillActive === 0n) {
      console.log('  PASS: cancel returned real value.\n');
      logTestResult(CONTRACT_NAME, 'cancelOffer', tx2.public.txId, tx2.public.blockHeight, 'PASS', `balance increased by ${returnDelta}`);
    } else {
      console.log('  FAIL: cancel path did not fully return the locked value.\n');
      logTestResult(CONTRACT_NAME, 'cancelOffer', tx2.public.txId, tx2.public.blockHeight, 'FAIL', `returnDelta=${returnDelta}, offerActive=${offerStillActive}`);
      allPassed = false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  FAIL: ${message}\n`);
    logTestResult(CONTRACT_NAME, 'cancelOffer', 'N/A', 'N/A', 'FAIL', message);
    allPassed = false;
  }

  console.log('--- Verify Final State ---\n');
  try {
    const finalBalance = await getBalance(walletCtx);
    console.log(`  Final wallet balance: ${finalBalance}`);

    const finalState = await providers.publicDataProvider.queryContractState(deployment.contractAddress);
    if (finalState) {
      const { contractModule } = await loadCompiledContractWithWitnesses(CONTRACT_NAME, witnesses);
      const ledgerState = contractModule.ledger(finalState.data);
      console.log(`  offerActive: "${ledgerState.offerActive}"`);
      console.log(`  offeredAmount: ${ledgerState.offeredAmount}`);
      console.log(`  requestedAmount: ${ledgerState.requestedAmount}`);
      console.log(`  isMatchComplete: "${ledgerState.isMatchComplete}"`);
      console.log(`  totalSwapsCompleted: ${ledgerState.totalSwapsCompleted}\n`);
    }
  } catch (error) {
    console.error(`  State read error: ${error instanceof Error ? error.message : error}\n`);
  }

  await walletCtx.wallet.stop();

  if (allPassed) {
    console.log('=== ALL RIVER CROSSING TESTS PASSED ===\n');
    process.exit(0);
  }

  console.log(`=== SOME TESTS FAILED - check test-results/${TEST_LOG_FILE_NAME} ===\n`);
  process.exit(1);
}

main().catch(console.error);
