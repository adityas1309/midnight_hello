import * as fs from 'node:fs';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import {
  TEST_SEED,
  createWallet,
  waitForSync,
  createProviders,
  loadCompiledContractWithWitnesses,
  getSpendableShieldedCoin,
  fundShieldedFromGenesis,
} from './src/utils.js';
import {
  createShieldedCoinInfo,
  encodeQualifiedShieldedCoinInfo,
  encodeShieldedCoinInfo,
  nativeToken,
} from '@midnight-ntwrk/ledger-v8';

const CONTRACT_NAME = 'river-crossing';
const OFFER_AMOUNT = 500n;
const REQUEST_AMOUNT = 250n;

function coinPublicKeyToBytes(
  coinPublicKey: { toHexString?: () => string } | string,
): Uint8Array {
  const hex = typeof coinPublicKey === 'string'
    ? coinPublicKey
    : coinPublicKey.toHexString?.() ?? '';
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex;
  return Buffer.from(normalized, 'hex');
}

async function main() {
  const witnessState: any = {};
  const takerCoin = createShieldedCoinInfo(nativeToken().raw, REQUEST_AMOUNT);
  const witnesses = {
    get_offer_coin: (ctx: any) => [ctx.privateState, encodeShieldedCoinInfo(witnessState.offerCoin)],
    get_taker_coin: (ctx: any) => [ctx.privateState, encodeShieldedCoinInfo(takerCoin)],
    get_maker_locked_coin: (ctx: any) => [ctx.privateState, encodeQualifiedShieldedCoinInfo(witnessState.lockedCoin)],
    get_maker_pubkey: (ctx: any) => [ctx.privateState, { bytes: witnessState.makerPubKey }],
    get_taker_pubkey: (ctx: any) => [ctx.privateState, { bytes: witnessState.takerPubKey }],
    get_maker_receive_value: (ctx: any) => [ctx.privateState, REQUEST_AMOUNT],
    get_taker_receive_value: (ctx: any) => [ctx.privateState, OFFER_AMOUNT],
    get_cancel_coin: (ctx: any) => [ctx.privateState, encodeQualifiedShieldedCoinInfo(witnessState.lockedCoin)],
    get_cancel_pubkey: (ctx: any) => [ctx.privateState, { bytes: witnessState.makerPubKey }],
    get_cancel_value: (ctx: any) => [ctx.privateState, OFFER_AMOUNT],
  };

  const deployment = JSON.parse(
    fs.readFileSync('deployments/river-crossing.json', 'utf-8'),
  );
  const walletCtx = await createWallet(TEST_SEED);
  try {
    await waitForSync(walletCtx);
    await fundShieldedFromGenesis(walletCtx, OFFER_AMOUNT);
    const synced = await waitForSync(walletCtx);
    witnessState.makerPubKey = coinPublicKeyToBytes(synced.shielded.coinPublicKey);
    witnessState.takerPubKey = coinPublicKeyToBytes(synced.shielded.coinPublicKey);
    witnessState.offerCoin = await getSpendableShieldedCoin(walletCtx, OFFER_AMOUNT);

    const { compiledContract } = await loadCompiledContractWithWitnesses(CONTRACT_NAME, witnesses);
    const providers = await createProviders(walletCtx, CONTRACT_NAME);
    const contract = await findDeployedContract(providers as any, {
      contractAddress: deployment.contractAddress,
      compiledContract: compiledContract as any,
      privateStateId: `${CONTRACT_NAME}State`,
      initialPrivateState: {},
    } as any);

    const pre = await providers.publicDataProvider.queryZSwapAndContractState(
      deployment.contractAddress,
    );
    if (!pre) throw new Error('no pre state');
    const [preState] = pre;

    console.log('pre firstFree', preState.firstFree.toString());

    const tx1 = await contract.callTx.createOffer(
      OFFER_AMOUNT,
      REQUEST_AMOUNT,
      'RunnerAlpha',
      'tDUST',
      'NIGHT',
    );

    console.log('tx status', tx1.public.status);
    console.log(
      'nextZswap currentIndex',
      tx1.private.nextZswapLocalState.currentIndex.toString(),
    );
    console.log(
      'nextZswap outputs',
      JSON.stringify(
        tx1.private.nextZswapLocalState.outputs,
        (_, value) => (typeof value === 'bigint' ? value.toString() : value),
        2,
      ),
    );
    console.log(
      'guaranteed outputs len',
      tx1.private.unprovenTx.guaranteedOffer?.outputs?.length ?? 'none',
    );
    for (const [i, out] of (tx1.private.unprovenTx.guaranteedOffer?.outputs ?? []).entries()) {
      console.log(
        'guaranteed output',
        i,
        'contractAddress',
        out.contractAddress,
        'commitment',
        out.commitment,
      );
    }

    const immediatePost = await providers.publicDataProvider.queryZSwapAndContractState(
      deployment.contractAddress,
    );
    if (immediatePost) {
      console.log('immediate post firstFree', immediatePost[0].firstFree.toString());
      console.log(
        'immediate post firstFree after postBlockUpdate',
        immediatePost[0].postBlockUpdate(new Date()).firstFree.toString(),
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 15000));
    const delayedPost = await providers.publicDataProvider.queryZSwapAndContractState(
      deployment.contractAddress,
    );
    if (delayedPost) {
      console.log('delayed post firstFree', delayedPost[0].firstFree.toString());
      console.log(
        'delayed post firstFree after postBlockUpdate',
        delayedPost[0].postBlockUpdate(new Date()).firstFree.toString(),
      );
    }
  } finally {
    await walletCtx.wallet.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
