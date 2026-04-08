import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as Rx from 'rxjs';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { encodeQualifiedShieldedCoinInfo, encodeShieldedCoinInfo, persistentCommit } from '@midnight-ntwrk/ledger-v8';
import type { Alignment } from '@midnight-ntwrk/ledger-v8';
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

const CONTRACT_NAME = 'stone-drop';
const DEPOSIT_AMOUNT = 10_000_000n;
const CLAIM_FEE_TOP_UP = 20_000_000n;

const BYTES32_ALIGNMENT: Alignment = [
  { tag: 'atom', value: { tag: 'bytes', length: 32 } },
];

type StoneDropWitnessState = {
  depositCoin?: any;
  lockedCoin?: any;
  priorContractOutputs?: any[];
  recipientPubKey?: Uint8Array;
  zswapLocalState?: any;
};

function generateBytes32(): Uint8Array {
  return crypto.randomBytes(32);
}

function computeCommitment(secret: Uint8Array, randomness: Uint8Array): Uint8Array {
  const result = persistentCommit(BYTES32_ALIGNMENT, [secret], [randomness]);
  return result[0];
}

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

function createStoneDropWitnesses(state: StoneDropWitnessState, depositAmount: bigint) {
  return {
    get_deposit_coin: (ctx: any) => {
      if (!state.depositCoin) throw new Error('Deposit coin not prepared');
      return [ctx.privateState, encodeShieldedCoinInfo(state.depositCoin)];
    },
    get_claim_coin: (ctx: any) => {
      if (!state.lockedCoin) throw new Error('Locked contract coin not recorded');
      return [ctx.privateState, encodeQualifiedShieldedCoinInfo(state.lockedCoin)];
    },
    get_claim_recipient: (ctx: any) => {
      if (!state.recipientPubKey) throw new Error('Recipient pubkey not prepared');
      return [ctx.privateState, { bytes: state.recipientPubKey }];
    },
    get_claim_value: (ctx: any) => [ctx.privateState, depositAmount],
  };
}

async function main() {
  console.log(`\n=== Test StoneDrop (Real Coin Escrow) on ${NETWORK_LABEL} ===\n`);

  const deploymentPath = `deployments/${CONTRACT_NAME}.json`;
  if (!fs.existsSync(deploymentPath)) {
    console.error('  No deployment found. Run: npm run deploy-stone-drop');
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
  await fundShieldedFromGenesis(walletCtx, DEPOSIT_AMOUNT);

  const syncedState = await waitForSync(walletCtx);
  const witnessState: StoneDropWitnessState = {
    recipientPubKey: coinPublicKeyToBytes(syncedState.shielded.coinPublicKey),
  };
  const witnesses = createStoneDropWitnesses(witnessState, DEPOSIT_AMOUNT);
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

  const secret = generateBytes32();
  const randomness = generateBytes32();
  const commitment = computeCommitment(secret, randomness);

  console.log(`  Test secret: 0x${Buffer.from(secret).toString('hex').substring(0, 16)}...`);
  console.log(`  Test randomness: 0x${Buffer.from(randomness).toString('hex').substring(0, 16)}...`);
  console.log(`  Commitment: 0x${Buffer.from(commitment).toString('hex').substring(0, 16)}...`);
  console.log(`  Deposit amount: ${DEPOSIT_AMOUNT}\n`);

  console.log('--- Test 1: deposit(secret, randomness) ---\n');
  try {
    const balanceBefore = await getBalance(walletCtx);
    console.log(`  Balance BEFORE deposit: ${balanceBefore}`);
    const [preDepositZswapState] =
      (await providers.publicDataProvider.queryZSwapAndContractState(deployment.contractAddress)) ?? [];
    if (!preDepositZswapState) throw new Error('Could not read pre-deposit zswap state');
    witnessState.depositCoin = await getSpendableShieldedCoin(walletCtx, DEPOSIT_AMOUNT);
    if (!witnessState.depositCoin) throw new Error(`No shielded coin available with value >= ${DEPOSIT_AMOUNT}`);

    console.log('  Calling deposit (20-30 seconds)...');
    const tx1 = await contract.callTx.deposit(secret, randomness);
    console.log(`  Transaction: ${tx1.public.txId}`);
    console.log(`  Block: ${tx1.public.blockHeight}`);

    await new Promise((resolve) => setTimeout(resolve, 5000));
    await waitForSync(walletCtx);
    const balanceAfter = await getBalance(walletCtx);
    const delta = balanceBefore - balanceAfter;
    console.log(`  Balance AFTER deposit: ${balanceAfter}`);
    console.log(`  Balance delta: -${delta}\n`);

    const lockedOutputIndex = tx1.private.nextZswapLocalState.outputs.findIndex(
      ({ recipient }: any) => !recipient.is_left,
    );
    if (lockedOutputIndex >= 0) {
      const lockedOutput = tx1.private.nextZswapLocalState.outputs[lockedOutputIndex];
      const lockedIndex = preDepositZswapState.firstFree;
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
    let totalDrops = 0n;
    let treeLeaves = 0n;
    if (state1) {
      const { contractModule } = await loadCompiledContractWithWitnesses(CONTRACT_NAME, witnesses);
      const ledgerState = contractModule.ledger(state1.data);
      totalDrops = BigInt(ledgerState.totalDrops);
      treeLeaves = BigInt(ledgerState.tree.firstFree());
      console.log(`  Ledger - totalDrops: ${ledgerState.totalDrops}`);
      console.log(`  Tree leaves: ${ledgerState.tree.firstFree()}\n`);
    }

    if (delta > 0n && witnessState.lockedCoin && totalDrops > 0n && treeLeaves > 0n) {
      console.log('  PASS: real coin lock confirmed.\n');
      logTestResult(CONTRACT_NAME, 'deposit', tx1.public.txId, tx1.public.blockHeight, 'PASS', `balance decreased by ${delta}`);
    } else {
      console.log('  FAIL: real contract lock was not fully observed.\n');
      logTestResult(
        CONTRACT_NAME,
        'deposit',
        tx1.public.txId,
        tx1.public.blockHeight,
        'FAIL',
        `delta=${delta}, lockedCoin=${Boolean(witnessState.lockedCoin)}, totalDrops=${totalDrops}, treeLeaves=${treeLeaves}`,
      );
      allPassed = false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  FAIL: ${message}\n`);
    logTestResult(CONTRACT_NAME, 'deposit', 'N/A', 'N/A', 'FAIL', message);
    allPassed = false;
  }

  console.log('--- Test 2: claim(secret, randomness, merkleProof) ---\n');
  try {
    await fundShieldedFromGenesis(walletCtx, CLAIM_FEE_TOP_UP);
    providers = await createProviders(walletCtx, CONTRACT_NAME);
    contract = await findDeployedContract(providers as any, {
      contractAddress: deployment.contractAddress,
      compiledContract: compiledContract as any,
      privateStateId: `${CONTRACT_NAME}State`,
      initialPrivateState: {},
    } as any);

    const balanceBefore = await getBalance(walletCtx);
    console.log(`  Balance BEFORE claim: ${balanceBefore}`);

    const currentState = await providers.publicDataProvider.queryContractState(deployment.contractAddress);
    if (!currentState) throw new Error('Could not read contract state');
    if (!witnessState.lockedCoin) throw new Error('Locked contract coin was not captured from deposit');
    if (!witnessState.zswapLocalState) throw new Error('Contract local zswap state was not captured from deposit');
    const encodedClaimCoin = encodeQualifiedShieldedCoinInfo(witnessState.lockedCoin);
    console.log(`  Claim coin value: ${encodedClaimCoin.value}`);
    console.log(`  Claim coin nonce bytes: ${encodedClaimCoin.nonce?.length ?? 'undefined'}`);
    console.log(`  Claim coin color bytes: ${encodedClaimCoin.color?.length ?? 'undefined'}`);
    console.log(`  Claim recipient bytes: ${witnessState.recipientPubKey?.length ?? 'undefined'}`);

    const { contractModule } = await loadCompiledContractWithWitnesses(CONTRACT_NAME, witnesses);
    const ledgerState = contractModule.ledger(currentState.data);
    const path = ledgerState.tree.findPathForLeaf(commitment);
    if (!path) throw new Error(`Commitment not found in tree (${ledgerState.tree.firstFree()} leaves).`);

    console.log('  Merkle proof generated.');
    console.log('  Calling claim (20-30 seconds)...');
    const tx2 = await submitContractCallWithLocalState(providers, {
      compiledContract: compiledContract as any,
      contractAddress: deployment.contractAddress,
      circuitId: 'claim',
      privateStateId: `${CONTRACT_NAME}State`,
      args: [secret, randomness, path],
      initialZswapLocalState: witnessState.zswapLocalState,
      priorContractOutputs: witnessState.priorContractOutputs,
    });
    console.log(`  Transaction: ${tx2.public.txId}`);
    console.log(`  Block: ${tx2.public.blockHeight}`);

    await new Promise((resolve) => setTimeout(resolve, 5000));
    await waitForSync(walletCtx);
    const balanceAfter = await getBalance(walletCtx);
    const delta = balanceAfter - balanceBefore;
    console.log(`  Balance AFTER claim: ${balanceAfter}`);
    console.log(`  Balance delta: +${delta}\n`);

    const finalClaimState = await providers.publicDataProvider.queryContractState(deployment.contractAddress);
    let totalClaims = 0n;
    if (finalClaimState) {
      const { contractModule: claimModule } = await loadCompiledContractWithWitnesses(CONTRACT_NAME, witnesses);
      const finalLedgerState = claimModule.ledger(finalClaimState.data);
      totalClaims = BigInt(finalLedgerState.totalClaims);
    }

    if (delta > 0n && totalClaims > 0n) {
      console.log('  PASS: real coin release confirmed.\n');
      logTestResult(CONTRACT_NAME, 'claim', tx2.public.txId, tx2.public.blockHeight, 'PASS', `balance increased by ${delta}`);
    } else {
      console.log('  FAIL: real contract release was not fully observed.\n');
      logTestResult(CONTRACT_NAME, 'claim', tx2.public.txId, tx2.public.blockHeight, 'FAIL', `delta=${delta}, totalClaims=${totalClaims}`);
      allPassed = false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  FAIL: ${message}\n`);
    logTestResult(CONTRACT_NAME, 'claim', 'N/A', 'N/A', 'FAIL', message);
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
      console.log(`  totalDrops: ${ledgerState.totalDrops}`);
      console.log(`  totalClaims: ${ledgerState.totalClaims}`);
      console.log(`  revokedDrops: ${ledgerState.revokedDrops}\n`);
    }
  } catch (error) {
    console.error(`  State read error: ${error instanceof Error ? error.message : error}\n`);
  }

  await walletCtx.wallet.stop();

  if (allPassed) {
    console.log('=== ALL STONE DROP TESTS PASSED ===\n');
    process.exit(0);
  }

  console.log(`=== SOME TESTS FAILED - check test-results/${TEST_LOG_FILE_NAME} ===\n`);
  process.exit(1);
}

main().catch(console.error);
