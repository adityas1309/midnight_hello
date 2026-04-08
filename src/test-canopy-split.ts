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
const RECIPIENT_SEEDS = [
  '5143af284298a7a06498ede2f6a2e36abcbfc45585a9fa5afaffa4f346686add',
  '6254bf395309b8b17509fdf3a7b3f47bcdcad56696b0ab6bababb5a457797bee',
  '7365cf406410c9c28610aea4b8c4a58cdedbe67707c1bc7cbcbcc6b568808cff',
];
const SPLIT_AMOUNTS = [100_000_000n, 100_000_000n, 100_000_000n];

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

async function getShieldedAddress(walletCtx: Awaited<ReturnType<typeof createWallet>>): Promise<string> {
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
  console.log(`\n=== Test Canopy Split (Real Multi-Output Send) on ${NETWORK_LABEL} ===\n`);
  console.log(`  Split amounts: ${SPLIT_AMOUNTS.map(String).join(', ')} base units\n`);

  console.log('--- Setting up Sender Wallet ---\n');
  const senderCtx = await createWallet(TEST_SEED);
  console.log('  Syncing sender wallet...');
  await waitForSync(senderCtx);
  await ensureShieldedFunds(senderCtx, SPLIT_AMOUNTS.reduce((a, b) => a + b, 0n));
  const senderAddr = await getShieldedAddress(senderCtx);
  console.log(`  Sender shielded address: ${senderAddr.substring(0, 40)}...\n`);

  const recipientContexts: Awaited<ReturnType<typeof createWallet>>[] = [];
  const recipientRecipients: any[] = [];

  for (let i = 0; i < 3; i++) {
    console.log(`--- Setting up Recipient ${i + 1} Wallet ---\n`);
    const ctx = await createWallet(RECIPIENT_SEEDS[i]);
    console.log(`  Syncing recipient ${i + 1} wallet...`);
    await waitForSync(ctx);
    const addr = await getShieldedAddress(ctx);
    const recipient = await getShieldedRecipient(ctx);
    console.log(`  Recipient ${i + 1} shielded address: ${addr.substring(0, 40)}...\n`);
    recipientContexts.push(ctx);
    recipientRecipients.push(recipient);
  }

  let allPassed = true;

  console.log('--- Test 1: Multi-Output Shielded Transfer (1 sender -> 3 recipients) ---\n');
  try {
    const senderBalanceBefore = await getBalance(senderCtx);
    console.log(`  Sender balance BEFORE: ${senderBalanceBefore}`);

    const recipientBalancesBefore: bigint[] = [];
    for (let i = 0; i < 3; i++) {
      const bal = await getBalance(recipientContexts[i]);
      recipientBalancesBefore.push(bal);
      console.log(`  Recipient ${i + 1} balance BEFORE: ${bal}`);
    }
    console.log('');

    const outputs = SPLIT_AMOUNTS.map((amount, i) => ({
      type: nativeToken().raw,
      receiverAddress: recipientRecipients[i],
      amount,
    }));

    console.log('  Sending multi-output shielded transfer...');
    const recipe = await senderCtx.wallet.transferTransaction(
      [{
        type: 'shielded' as const,
        outputs,
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

    console.log('\n  Waiting for balance updates (15s)...');
    await new Promise((resolve) => setTimeout(resolve, 15000));
    await waitForSync(senderCtx);

    const senderBalanceAfter = await getBalance(senderCtx);
    console.log(`  Sender balance AFTER: ${senderBalanceAfter}`);
    const senderDelta = senderBalanceBefore - senderBalanceAfter;
    console.log(`  Sender total delta: -${senderDelta}\n`);

    const recipientDeltas: bigint[] = [];
    for (let i = 0; i < 3; i++) {
      await waitForSync(recipientContexts[i]);
      const bal = await getBalance(recipientContexts[i]);
      const delta = bal - recipientBalancesBefore[i];
      recipientDeltas.push(delta);
      console.log(`  Recipient ${i + 1} balance AFTER: ${bal}  (delta: +${delta})`);
    }
    console.log('');

    const totalReceived = recipientDeltas.reduce((a, b) => a + b, 0n);
    if (senderDelta > 0n && totalReceived > 0n) {
      console.log('  PASS: real multi-output private send confirmed.\n');
      logTestResult(
        'canopy-split',
        'multi-output-send',
        String(txId),
        'N/A',
        'PASS',
        `sender: -${senderDelta}, recipients: +${recipientDeltas.join(', +')}`,
      );
    } else {
      console.log('  FAIL: sender spend and recipient receipts were not both observed.\n');
      logTestResult(
        'canopy-split',
        'multi-output-send',
        String(txId),
        'N/A',
        'FAIL',
        `sender: -${senderDelta}, recipients: +${recipientDeltas.join(', +')}`,
      );
      allPassed = false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  FAIL: ${message}\n`);
    logTestResult('canopy-split', 'multi-output-send', 'N/A', 'N/A', 'FAIL', message);
    allPassed = false;
  }

  console.log('--- Test 2: Record Canopy Split score on ShadowRunner ---\n');
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

      console.log('  Recording completeMission("canopy_split", 150pts)...');
      const tx = await srContract.callTx.completeMission('canopy_split', 'Seedling', 150n, 250n, 250n);
      console.log(`  Transaction: ${tx.public.txId}`);
      console.log(`  Block: ${tx.public.blockHeight}\n`);
      logTestResult('canopy-split', 'completeMission', tx.public.txId, tx.public.blockHeight, 'PASS');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  FAIL: ${message}\n`);
    logTestResult('canopy-split', 'completeMission', 'N/A', 'N/A', 'FAIL', message);
    allPassed = false;
  }

  await senderCtx.wallet.stop();
  for (const ctx of recipientContexts) {
    await ctx.wallet.stop();
  }

  if (allPassed) {
    console.log('=== ALL CANOPY SPLIT TESTS PASSED ===\n');
    process.exit(0);
  }

  console.log(`=== SOME TESTS FAILED - check test-results/${TEST_LOG_FILE_NAME} ===\n`);
  process.exit(1);
}

main().catch(console.error);
