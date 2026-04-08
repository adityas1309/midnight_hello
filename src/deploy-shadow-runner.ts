import * as fs from 'node:fs';
import * as Rx from 'rxjs';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { unshieldedToken } from '@midnight-ntwrk/ledger-v8';
import {
  NETWORK_ID,
  NETWORK_LABEL,
  TEST_SEED,
  createProviders,
  createWallet,
  loadCompiledContract,
  printFundingHint,
  registerForDust,
  waitForSync,
} from './utils.js';

const CONTRACT_NAME = 'shadow-runner';

async function main() {
  console.log(`\n=== Deploy ShadowRunner to ${NETWORK_LABEL} ===\n`);

  const { compiledContract, zkConfigPath } = await loadCompiledContract(CONTRACT_NAME);
  console.log(`  Compiled contract loaded from ${zkConfigPath}\n`);

  console.log('--- Wallet Setup ---\n');
  console.log(`  Using seed: ${TEST_SEED.substring(0, 16)}...`);
  const walletCtx = await createWallet(TEST_SEED);
  printFundingHint(walletCtx);

  console.log('  Syncing with local network...');
  const state = await waitForSync(walletCtx);
  const balance = state.unshielded.balances[unshieldedToken().raw] ?? 0n;
  console.log(`  Balance: ${balance.toLocaleString()} tNight\n`);

  if (balance === 0n) {
    console.log('  No funds detected on the local network yet.');
    console.log('  Keep midnight-local-dev running and fund the address above.');
    console.log('  Waiting for funds...');
    await Rx.firstValueFrom(
      walletCtx.wallet.state().pipe(
        Rx.throttleTime(10000),
        Rx.filter((syncState) => syncState.isSynced),
        Rx.map((syncState) => syncState.unshielded.balances[unshieldedToken().raw] ?? 0n),
        Rx.filter((availableBalance) => availableBalance > 0n),
      ),
    );
    console.log('  Funds received.\n');
  }

  console.log('--- DUST Token Setup ---\n');
  await registerForDust(walletCtx);

  console.log('\n--- Deploy Contract ---\n');
  console.log('  Setting up providers...');
  const providers = await createProviders(walletCtx, CONTRACT_NAME);

  console.log('  Deploying contract (this may take 30-60 seconds)...\n');
  const deployed = await deployContract(providers as any, {
    compiledContract: compiledContract as any,
    privateStateId: `${CONTRACT_NAME}State`,
    initialPrivateState: {},
  } as any);

  const contractAddress = deployed.deployTxData.public.contractAddress;
  console.log('  Contract deployed successfully.\n');
  console.log(`  Contract Address: ${contractAddress}\n`);

  const deploymentsDir = 'deployments';
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentInfo = {
    contractAddress,
    contractName: CONTRACT_NAME,
    seed: TEST_SEED,
    network: NETWORK_ID,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    `${deploymentsDir}/${CONTRACT_NAME}.json`,
    JSON.stringify(deploymentInfo, null, 2),
  );
  console.log(`  Saved to ${deploymentsDir}/${CONTRACT_NAME}.json\n`);

  await walletCtx.wallet.stop();
  console.log('--- Deployment Complete ---\n');
}

main().catch(console.error);
