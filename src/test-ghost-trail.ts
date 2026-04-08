import * as fs from 'node:fs';
import * as Rx from 'rxjs';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { nativeToken } from '@midnight-ntwrk/ledger-v8';
import { MidnightBech32m } from '@midnight-ntwrk/wallet-sdk-address-format';
import {
  ensureShieldedFunds,
  NETWORK_ID,
  NETWORK_LABEL,
  TEST_LOG_FILE_NAME,
  TEST_SEED,
  createProviders,
  createWallet,
  loadCompiledContract,
  logTestResult,
  waitForSync,
} from './utils.js';

const SHADOW_RUNNER_CONTRACT = 'shadow-runner';
const RECIPIENT_SEED = '4032fe173187f6f95387dfd1e5f1d259bcaeb34474f8ef4fefef93e235575fcc';
const TRANSFER_AMOUNT = 100_000_000n;

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

async function getShieldedAddressPreview(walletCtx: Awaited<ReturnType<typeof createWallet>>): Promise<string> {
  const state = await Rx.firstValueFrom(
    walletCtx.wallet.state().pipe(Rx.filter((s) => s.isSynced)),
  );
  return MidnightBech32m.encode(NETWORK_ID, state.shielded.address).asString();
}

async function getShieldedRecipient(walletCtx: Awaited<ReturnType<typeof createWallet>>) {
  const state = await Rx.firstValueFrom(
    walletCtx.wallet.state().pipe(Rx.filter((s) => s.isSynced)),
  );
  return state.shielded.address;
}

async function main() {
  console.log(`\n=== Test Ghost Trail (Real Private Send) on ${NETWORK_LABEL} ===\n`);
  console.log(`  Transfer amount: ${TRANSFER_AMOUNT} base units\n`);

  console.log('--- Setting up Sender Wallet ---\n');
  const senderCtx = await createWallet(TEST_SEED);
  console.log('  Syncing sender wallet...');
  await waitForSync(senderCtx);
  await ensureShieldedFunds(senderCtx, TRANSFER_AMOUNT);
  const senderShieldedAddr = await getShieldedAddressPreview(senderCtx);
  console.log(`  Sender shielded address: ${senderShieldedAddr.substring(0, 40)}...\n`);

  console.log('--- Setting up Recipient Wallet ---\n');
  const recipientCtx = await createWallet(RECIPIENT_SEED);
  console.log('  Syncing recipient wallet...');
  await waitForSync(recipientCtx);
  const recipientShieldedAddr = await getShieldedAddressPreview(recipientCtx);
  const recipientShieldedRecipient = await getShieldedRecipient(recipientCtx);
  console.log(`  Recipient shielded address: ${recipientShieldedAddr.substring(0, 40)}...\n`);

  let allPassed = true;

  console.log('--- Test 1: Shielded Transfer (sender -> recipient) ---\n');
  try {
    const senderBalanceBefore = await getBalance(senderCtx);
    const recipientBalanceBefore = await getBalance(recipientCtx);
    console.log(`  Sender balance BEFORE: ${senderBalanceBefore}`);
    console.log(`  Recipient balance BEFORE: ${recipientBalanceBefore}`);
    console.log(`  Sending ${TRANSFER_AMOUNT} shielded to recipient...`);

    const recipe = await senderCtx.wallet.transferTransaction(
      [{
        type: 'shielded',
        outputs: [{
          type: nativeToken().raw,
          receiverAddress: recipientShieldedRecipient,
          amount: TRANSFER_AMOUNT,
        }],
      }],
      {
        shieldedSecretKeys: senderCtx.shieldedSecretKeys,
        dustSecretKey: senderCtx.dustSecretKey,
      },
      {
        ttl: new Date(Date.now() + 30 * 60 * 1000),
        payFees: true,
      },
    );

    const finalized = await senderCtx.wallet.finalizeTransaction(recipe.transaction);
    const txId = await senderCtx.wallet.submitTransaction(finalized);
    console.log(`  Transaction submitted: ${txId}`);

    console.log('  Waiting for balance updates (10s)...');
    await new Promise((resolve) => setTimeout(resolve, 10000));
    await waitForSync(senderCtx);
    await waitForSync(recipientCtx);

    const senderBalanceAfter = await getBalance(senderCtx);
    const recipientBalanceAfter = await getBalance(recipientCtx);
    console.log(`  Sender balance AFTER: ${senderBalanceAfter}`);
    console.log(`  Recipient balance AFTER: ${recipientBalanceAfter}`);

    const senderDelta = senderBalanceBefore - senderBalanceAfter;
    const recipientDelta = recipientBalanceAfter - recipientBalanceBefore;
    console.log(`  Sender delta: -${senderDelta}`);
    console.log(`  Recipient delta: +${recipientDelta}\n`);

    if (senderDelta > 0n && recipientDelta > 0n) {
      console.log('  PASS: real shielded transfer confirmed.\n');
      logTestResult(
        'ghost-trail',
        'shielded-transfer',
        String(txId),
        'N/A',
        'PASS',
        `sender: -${senderDelta}, recipient: +${recipientDelta}`,
      );
    } else {
      console.log('  FAIL: sender spend and recipient receipt were not both observed.\n');
      logTestResult(
        'ghost-trail',
        'shielded-transfer',
        String(txId),
        'N/A',
        'FAIL',
        `sender: -${senderDelta}, recipient: +${recipientDelta}`,
      );
      allPassed = false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  FAIL: ${message}\n`);
    logTestResult('ghost-trail', 'shielded-transfer', 'N/A', 'N/A', 'FAIL', message);
    allPassed = false;
  }

  console.log('--- Test 2: Record Ghost Trail score on ShadowRunner ---\n');
  try {
    const srDeploymentPath = `deployments/${SHADOW_RUNNER_CONTRACT}.json`;
    if (!fs.existsSync(srDeploymentPath)) {
      console.log('  ShadowRunner not deployed, skipping score recording.\n');
    } else {
      const srDeployment = JSON.parse(fs.readFileSync(srDeploymentPath, 'utf-8'));
      const { compiledContract: srCompiled } = await loadCompiledContract(SHADOW_RUNNER_CONTRACT);
      const srProviders = await createProviders(senderCtx, SHADOW_RUNNER_CONTRACT);

      const srContract = await findDeployedContract(srProviders as any, {
        contractAddress: srDeployment.contractAddress,
        compiledContract: srCompiled as any,
        privateStateId: `${SHADOW_RUNNER_CONTRACT}State`,
        initialPrivateState: {},
      } as any);

      console.log('  Recording completeMission("ghost_trail", 100pts)...');
      const tx = await srContract.callTx.completeMission('ghost_trail', 'Seedling', 100n, 100n, 100n);
      console.log(`  Transaction: ${tx.public.txId}`);
      console.log(`  Block: ${tx.public.blockHeight}\n`);
      logTestResult('ghost-trail', 'completeMission', tx.public.txId, tx.public.blockHeight, 'PASS');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  FAIL: ${message}\n`);
    logTestResult('ghost-trail', 'completeMission', 'N/A', 'N/A', 'FAIL', message);
    allPassed = false;
  }

  await senderCtx.wallet.stop();
  await recipientCtx.wallet.stop();

  if (allPassed) {
    console.log('=== ALL GHOST TRAIL TESTS PASSED ===\n');
    process.exit(0);
  }

  console.log(`=== SOME TESTS FAILED - check test-results/${TEST_LOG_FILE_NAME} ===\n`);
  process.exit(1);
}

main().catch(console.error);
