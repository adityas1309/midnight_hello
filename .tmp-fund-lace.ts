import { MidnightBech32m, UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import { nativeToken } from '@midnight-ntwrk/ledger-v8';
import { createWallet, waitForSync, NETWORK_ID } from './src/utils.js';

const RECIPIENT = process.argv[2];
const AMOUNT = 50_000n * 10n ** 6n;
const GENESIS_SENDER_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

if (!RECIPIENT) {
  throw new Error('Usage: tsx .tmp-fund-lace.ts <mn_addr_...>');
}

async function main() {
  const parsed = MidnightBech32m.parse(RECIPIENT);
  const unshieldedAddress = UnshieldedAddress.codec.decode(NETWORK_ID as any, parsed);

  const genesisCtx = await createWallet(GENESIS_SENDER_SEED);
  try {
    await waitForSync(genesisCtx);

    const recipe = await genesisCtx.wallet.transferTransaction(
      [{
        type: 'unshielded',
        outputs: [{
          type: nativeToken().raw,
          receiverAddress: unshieldedAddress,
          amount: AMOUNT,
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
    const txId = await genesisCtx.wallet.submitTransaction(finalized);
    console.log(`FUNDED ${RECIPIENT}`);
    console.log(`AMOUNT ${AMOUNT.toString()}`);
    console.log(`TX ${txId}`);
  } finally {
    await genesisCtx.wallet.stop();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
