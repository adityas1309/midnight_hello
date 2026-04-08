import { WebSocket } from 'ws';
import * as Rx from 'rxjs';
import { Buffer } from 'buffer';
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
import { MidnightBech32m, UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';

globalThis.WebSocket = WebSocket;

const RECIPIENT = process.argv[2];
const NETWORK_ID = 'undeployed';
const GENESIS_SENDER_SEED = '0000000000000000000000000000000000000000000000000000000000000001';
const AMOUNT = 50_000n * 10n ** 6n;
const CONFIG = {
  indexer: 'http://127.0.0.1:8088/api/v4/graphql',
  indexerWS: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
  node: 'http://127.0.0.1:9944',
  proofServer: 'http://127.0.0.1:6300',
};

if (!RECIPIENT) {
  throw new Error('Usage: node .tmp-fund-lace.mjs <mn_addr_...>');
}

function deriveKeys(seed) {
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

async function createWallet(seed) {
  const keys = deriveKeys(seed);
  const txHistoryStorage = new InMemoryTransactionHistoryStorage();
  const costParameters = {
    additionalFeeOverhead: 300_000_000_000_000n,
    feeBlocksMargin: 5,
  };

  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], NETWORK_ID);

  const walletConfig = {
    networkId: NETWORK_ID,
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
    networkId: NETWORK_ID,
    indexerClientConnection: walletConfig.indexerClientConnection,
    txHistoryStorage,
  }).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore));
  const dustWallet = DustWallet(walletConfig).startWithSecretKey(
    dustSecretKey,
    ledger.LedgerParameters.initialParameters().dust,
  );

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

async function waitForSync(walletCtx) {
  return Rx.firstValueFrom(
    walletCtx.wallet.state().pipe(
      Rx.throttleTime(5000),
      Rx.filter((s) => s.isSynced),
    ),
  );
}

async function registerNightForDust(walletCtx) {
  const state = await Rx.firstValueFrom(
    walletCtx.wallet.state().pipe(Rx.filter((s) => s.isSynced)),
  );

  const unregisteredNightUtxos = state.unshielded?.availableCoins.filter(
    (coin) => coin.meta?.registeredForDustGeneration === false,
  ) ?? [];

  const currentDust = state.dust?.balance(new Date()) ?? 0n;
  if (currentDust > 0n || unregisteredNightUtxos.length === 0) {
    return;
  }

  const recipe = await walletCtx.wallet.registerNightUtxosForDustGeneration(
    unregisteredNightUtxos,
    walletCtx.unshieldedKeystore.getPublicKey(),
    (payload) => walletCtx.unshieldedKeystore.signData(payload),
  );

  const finalized = await walletCtx.wallet.finalizeRecipe(recipe);
  await walletCtx.wallet.submitTransaction(finalized);

  await Rx.firstValueFrom(
    walletCtx.wallet.state().pipe(
      Rx.throttleTime(5000),
      Rx.filter((s) => (s.dust?.balance(new Date()) ?? 0n) > 0n),
    ),
  );
}

const parsed = MidnightBech32m.parse(RECIPIENT);
const unshieldedAddress = UnshieldedAddress.codec.decode(NETWORK_ID, parsed);

const genesisCtx = await createWallet(GENESIS_SENDER_SEED);
try {
  await waitForSync(genesisCtx);
  await registerNightForDust(genesisCtx);

  const recipe = await genesisCtx.wallet.transferTransaction(
    [{
      type: 'unshielded',
      outputs: [{
        type: ledger.nativeToken().raw,
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

  const finalized = await genesisCtx.wallet.finalizeRecipe(recipe);
  const txId = await genesisCtx.wallet.submitTransaction(finalized);
  console.log(`FUNDED ${RECIPIENT}`);
  console.log(`AMOUNT ${AMOUNT.toString()}`);
  console.log(`TX ${txId}`);
} finally {
  await genesisCtx.wallet.stop();
}
