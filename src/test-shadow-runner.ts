import * as fs from 'node:fs';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import {
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

const CONTRACT_NAME = 'shadow-runner';

async function main() {
  console.log(`\n=== Test ShadowRunner on ${NETWORK_LABEL} ===\n`);

  const deploymentPath = `deployments/${CONTRACT_NAME}.json`;
  if (!fs.existsSync(deploymentPath)) {
    console.error('  No deployment found. Run: npm run deploy-shadow-runner');
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
  if (deployment.network !== NETWORK_ID) {
    console.error(
      `  Deployment network mismatch. Found "${deployment.network}", expected "${NETWORK_ID}". Redeploy locally first.`,
    );
    process.exit(1);
  }
  console.log(`  Contract: ${deployment.contractAddress}\n`);

  console.log('--- Connecting ---\n');
  const { compiledContract } = await loadCompiledContract(CONTRACT_NAME);
  const walletCtx = await createWallet(TEST_SEED);

  console.log('  Syncing wallet...');
  await waitForSync(walletCtx);

  console.log('  Setting up providers...');
  const providers = await createProviders(walletCtx, CONTRACT_NAME);

  console.log('  Joining contract...');
  const contract = await findDeployedContract(providers as any, {
    contractAddress: deployment.contractAddress,
    compiledContract: compiledContract as any,
    privateStateId: `${CONTRACT_NAME}State`,
    initialPrivateState: {},
  } as any);
  console.log('  Connected.\n');

  let allPassed = true;
  const ADMIN_SECRET = 'shadow-run-admin-2025';

  console.log('--- Test 1: registerRunner("ShadowTestRunner", "Seedling", adminSecret) ---\n');
  try {
    console.log('  Calling registerRunner (20-30 seconds)...');
    const tx1 = await contract.callTx.registerRunner('ShadowTestRunner', 'Seedling', ADMIN_SECRET);
    console.log(`  Transaction: ${tx1.public.txId}`);
    console.log(`  Block: ${tx1.public.blockHeight}\n`);
    logTestResult(CONTRACT_NAME, 'registerRunner', tx1.public.txId, tx1.public.blockHeight, 'PASS');

    const state1 = await providers.publicDataProvider.queryContractState(deployment.contractAddress);
    if (state1) {
      const { contractModule } = await loadCompiledContract(CONTRACT_NAME);
      const ledgerState = contractModule.ledger(state1.data);
      console.log(`  Ledger - runnerName: "${ledgerState.runnerName}"`);
      console.log(`  Ledger - currentRank: "${ledgerState.currentRank}"`);
      console.log(`  Ledger - isRegistered: "${ledgerState.isRegistered}"\n`);
    }
  } catch (error) {
    console.error(`  FAILED: ${error instanceof Error ? error.message : error}\n`);
    logTestResult(CONTRACT_NAME, 'registerRunner', 'N/A', 'N/A', 'FAIL', String(error));
    allPassed = false;
  }

  console.log('--- Test 2: completeMission("ghost_trail", 100pts) ---\n');
  try {
    console.log('  Calling completeMission (20-30 seconds)...');
    const tx2 = await contract.callTx.completeMission('ghost_trail', 'Seedling', 100n, 100n, 100n);
    console.log(`  Transaction: ${tx2.public.txId}`);
    console.log(`  Block: ${tx2.public.blockHeight}\n`);
    logTestResult(CONTRACT_NAME, 'completeMission(ghost_trail)', tx2.public.txId, tx2.public.blockHeight, 'PASS');
  } catch (error) {
    console.error(`  FAILED: ${error instanceof Error ? error.message : error}\n`);
    logTestResult(CONTRACT_NAME, 'completeMission(ghost_trail)', 'N/A', 'N/A', 'FAIL', String(error));
    allPassed = false;
  }

  console.log('--- Test 3: completeMission("river_crossing", 200pts) ---\n');
  try {
    console.log('  Calling completeMission (20-30 seconds)...');
    const tx3 = await contract.callTx.completeMission('river_crossing', 'Seedling', 200n, 300n, 300n);
    console.log(`  Transaction: ${tx3.public.txId}`);
    console.log(`  Block: ${tx3.public.blockHeight}\n`);
    logTestResult(CONTRACT_NAME, 'completeMission(river_crossing)', tx3.public.txId, tx3.public.blockHeight, 'PASS');
  } catch (error) {
    console.error(`  FAILED: ${error instanceof Error ? error.message : error}\n`);
    logTestResult(CONTRACT_NAME, 'completeMission(river_crossing)', 'N/A', 'N/A', 'FAIL', String(error));
    allPassed = false;
  }

  console.log('--- Test 4: resetWeeklyScore(adminSecret) ---\n');
  try {
    console.log('  Calling resetWeeklyScore (20-30 seconds)...');
    const tx4 = await contract.callTx.resetWeeklyScore(ADMIN_SECRET);
    console.log(`  Transaction: ${tx4.public.txId}`);
    console.log(`  Block: ${tx4.public.blockHeight}\n`);
    logTestResult(CONTRACT_NAME, 'resetWeeklyScore', tx4.public.txId, tx4.public.blockHeight, 'PASS');
  } catch (error) {
    console.error(`  FAILED: ${error instanceof Error ? error.message : error}\n`);
    logTestResult(CONTRACT_NAME, 'resetWeeklyScore', 'N/A', 'N/A', 'FAIL', String(error));
    allPassed = false;
  }

  console.log('--- Verify Final State ---\n');
  try {
    const finalState = await providers.publicDataProvider.queryContractState(deployment.contractAddress);
    if (finalState) {
      const { contractModule } = await loadCompiledContract(CONTRACT_NAME);
      const ledgerState = contractModule.ledger(finalState.data);
      console.log(`  runnerName: "${ledgerState.runnerName}"`);
      console.log(`  currentRank: "${ledgerState.currentRank}"`);
      console.log(`  isRegistered: "${ledgerState.isRegistered}"`);
      console.log(`  lastMissionType: "${ledgerState.lastMissionType}"`);
      console.log(`  trailScore: ${ledgerState.trailScore}`);
      console.log(`  weeklyScore: ${ledgerState.weeklyScore}`);
      console.log(`  totalMissions: ${ledgerState.totalMissions}\n`);
    }
  } catch (error) {
    console.error(`  State read error: ${error instanceof Error ? error.message : error}\n`);
  }

  await walletCtx.wallet.stop();

  if (allPassed) {
    console.log('=== ALL SHADOW RUNNER TESTS PASSED ===\n');
    process.exit(0);
  }

  console.log(`=== SOME TESTS FAILED - check test-results/${TEST_LOG_FILE_NAME} ===\n`);
  process.exit(1);
}

main().catch(console.error);
