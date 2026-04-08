import { CONTRACTS, NETWORK, NETWORK_ID, NETWORK_LABEL, hasConfiguredContractAddress, getRankForScore, MISSIONS, type MissionId } from './contracts';
import { getActiveModifiers, calculateFinalPoints, type Modifier } from './modifiers';
import { useGameStore } from '../game/store';
import { STORAGE_KEYS, readStorageItem, removeStorageItem } from './storage';
import type { InitialAPI, WalletConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

export interface RunnerState {
  runnerName: string;
  currentRank: string;
  rankEmoji: string;
  isRegistered: boolean;
  trailScore: number;
  weeklyScore: number;
  totalMissions: number;
  lastMissionType: string;
}

export interface MarketOffer {
  offeredAmount: number;
  requestedAmount: number;
  offerCreator: string;
  offeredAsset: string;
  wantAsset: string;
  offerActive: boolean;
  isMatchComplete: boolean;
  totalSwapsCompleted: number;
}

export interface StoneDropState {
  totalDrops: number;
  totalClaims: number;
  revokedDrops: number;
}

export interface ActivityEntry {
  id: string;
  type: MissionId;
  icon: string;
  message: string;
  points: number;
  timestamp: Date;
}

export interface GameState {
  walletConnected: boolean;
  walletAddress: string;
  runner: RunnerState;
  market: MarketOffer;
  stoneDrop: StoneDropState;
  activities: ActivityEntry[];
  sessionMissions: number;
  chainAlertActive: boolean;
  weatherPeriod: 'dawn' | 'day' | 'dusk' | 'night';
}

export function createInitialState(): GameState {
  return {
    walletConnected: false,
    walletAddress: '',
    runner: createEmptyRunnerState(),
    market: createEmptyMarketState(),
    stoneDrop: createEmptyStoneDropState(),
    activities: [],
    sessionMissions: 0,
    chainAlertActive: isChainAlertActive(),
    weatherPeriod: getWeatherPeriod(),
  };
}

function getWeatherPeriod(): 'dawn' | 'day' | 'dusk' | 'night' {
  const hour = new Date().getUTCHours();
  if (hour >= 4 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

function isChainAlertActive(): boolean {
  const now = new Date();
  return now.getUTCHours() % 3 === 0 && now.getUTCMinutes() < 30;
}

export function getSeasonDaysRemaining(): number {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  return dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
}

function getStoredRunnerName(): string {
  return readStorageItem(STORAGE_KEYS.runnerName) || '';
}

function createEmptyRunnerState(): RunnerState {
  return {
    runnerName: getStoredRunnerName(),
    currentRank: 'Seedling',
    rankEmoji: '🌱',
    isRegistered: false,
    trailScore: 0,
    weeklyScore: 0,
    totalMissions: 0,
    lastMissionType: '',
  };
}

function createEmptyMarketState(): MarketOffer {
  return {
    offeredAmount: 0,
    requestedAmount: 0,
    offerCreator: '',
    offeredAsset: '',
    wantAsset: '',
    offerActive: false,
    isMatchComplete: false,
    totalSwapsCompleted: 0,
  };
}

function createEmptyStoneDropState(): StoneDropState {
  return {
    totalDrops: 0,
    totalClaims: 0,
    revokedDrops: 0,
  };
}

export async function connectWallet(): Promise<{ address: string; connected: boolean }> {
  const midnight = (window as any).midnight;

  if (!midnight) {
    console.warn('[gameState] Lace wallet connected: NO - window.midnight is undefined.');
    alert('Lace wallet not detected. Please install the Midnight Lace extension.');
    return { address: '', connected: false };
  }

  const providerEntries = Object.entries(midnight) as Array<[string, InitialAPI]>;
  if (providerEntries.length === 0) {
    console.warn('[gameState] Lace wallet connected: NO - no providers found under window.midnight.');
    return { address: '', connected: false };
  }

  console.log(
    '[gameState] Midnight providers detected:',
    providerEntries.map(([key, provider]) => ({
      key,
      name: provider?.name ?? 'unknown',
      rdns: provider?.rdns ?? 'unknown',
      apiVersion: provider?.apiVersion ?? 'unknown',
    })),
  );

  const [providerKey, provider] =
    providerEntries.find(([, candidate]) =>
      String(candidate?.name ?? '').toLowerCase().includes('lace') ||
      String(candidate?.rdns ?? '').toLowerCase().includes('lace'),
    ) ?? providerEntries[0];

  try {
    if (typeof provider.connect === 'function') {
      console.log(
        `[gameState] Connecting to Lace provider "${providerKey}" on ${NETWORK_LABEL}...`,
      );
      const walletApi = await provider.connect(NETWORK_ID);

      if (typeof walletApi.getConnectionStatus === 'function') {
        const status = await walletApi.getConnectionStatus();
        console.log('[gameState] Lace wallet connection status:', status);
      }

      if (typeof walletApi.getConfiguration === 'function') {
        const configuration = await walletApi.getConfiguration();
        console.log('[gameState] Lace wallet configuration:', configuration);
      }

      return extractAddress(walletApi);
    }

    if (midnight.mnLace && typeof midnight.mnLace.enable === 'function') {
      const walletApi = await midnight.mnLace.enable();
      return extractAddress(walletApi);
    }

    alert(
      'Lace wallet detected, but the connection API is unexpected. Ensure you are using a Midnight-compatible Lace build.',
    );
    return { address: '', connected: false };
  } catch (error) {
    console.error('Connection request failed or user rejected:', error);
    alert(
      `Connection failed. Please unlock Lace and confirm it is set to ${NETWORK_ID} before trying again.`,
    );
    return { address: '', connected: false };
  }
}

async function extractAddress(
  walletApi: WalletConnectedAPI | any,
): Promise<{ address: string; connected: boolean }> {
  let address = 'lace-connected-wallet';
  let fullAddress = '';

  if (typeof walletApi.getUnshieldedAddress === 'function') {
    try {
      const result = await walletApi.getUnshieldedAddress();
      if (result?.unshieldedAddress) {
        fullAddress = result.unshieldedAddress;
        address = `${result.unshieldedAddress.substring(0, 16)}...`;
      }
    } catch (error) {
      console.warn('Failed to fetch unshielded address:', error);
    }
  } else if (typeof walletApi.state === 'function') {
    try {
      const state = await walletApi.state();
      if (state?.coinPublicKey) {
        fullAddress = state.coinPublicKey;
        address = `${state.coinPublicKey.substring(0, 16)}...`;
      }
    } catch (error) {
      console.warn('Failed to fetch wallet state:', error);
    }
  } else if (typeof walletApi.getUsedAddresses === 'function') {
    try {
      const addresses = await walletApi.getUsedAddresses();
      if (addresses?.length > 0) {
        fullAddress = addresses[0];
        address = addresses[0];
      }
    } catch (error) {
      console.warn('Failed to fetch used addresses:', error);
    }
  }

  console.log('[gameState] Lace wallet connected: YES', {
    displayAddress: address,
    fullAddress: fullAddress || address,
  });

  useGameStore.getState().setWalletAddress(address);
  return { address, connected: true };
}

export async function fetchRunnerState(): Promise<RunnerState> {
  const fallback = createEmptyRunnerState();

  if (!hasConfiguredContractAddress('shadowRunner')) {
    return fallback;
  }

  try {
    const response = await fetch(NETWORK.indexer, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          contractState(contractAddress: "${CONTRACTS.shadowRunner.address}") {
            data
          }
        }`,
      }),
    });

    const json = await response.json();
    const data = json?.data?.contractState?.data;
    if (!data) {
      return fallback;
    }

    const trailScore = parseInt(data.trailScore || '0', 10);
    const rank = getRankForScore(trailScore);
    const contractRunnerName = data.runnerName || '';
    const localRunnerName = getStoredRunnerName();
    const isThisWallet = localRunnerName !== '' && contractRunnerName === localRunnerName;
    const isRegistered = (data.isRegistered === '1' || data.isRegistered === 1) && isThisWallet;

    return {
      runnerName: isThisWallet ? contractRunnerName : localRunnerName || '',
      currentRank: isThisWallet ? rank.rank : fallback.currentRank,
      rankEmoji: isThisWallet ? rank.emoji : fallback.rankEmoji,
      isRegistered,
      trailScore: isThisWallet ? trailScore : 0,
      weeklyScore: isThisWallet ? parseInt(data.weeklyScore || '0', 10) : 0,
      totalMissions: isThisWallet ? parseInt(data.totalMissions || '0', 10) : 0,
      lastMissionType: isThisWallet ? (data.lastMissionType || '') : '',
    };
  } catch (error) {
    console.error('Failed to fetch runner state:', error);
    return fallback;
  }
}

export async function fetchMarketState(): Promise<MarketOffer> {
  const fallback = createEmptyMarketState();

  if (!hasConfiguredContractAddress('riverCrossing')) {
    return fallback;
  }

  try {
    const response = await fetch(NETWORK.indexer, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          contractState(contractAddress: "${CONTRACTS.riverCrossing.address}") {
            data
          }
        }`,
      }),
    });

    const json = await response.json();
    const data = json?.data?.contractState?.data;
    if (!data) {
      return fallback;
    }

    return {
      offeredAmount: parseInt(data.offeredAmount || '0', 10),
      requestedAmount: parseInt(data.requestedAmount || '0', 10),
      offerCreator: data.offerCreator || '',
      offeredAsset: data.offeredAsset || '',
      wantAsset: data.wantAsset || '',
      offerActive: data.offerActive === '1' || data.offerActive === 1,
      isMatchComplete: data.isMatchComplete === '1' || data.isMatchComplete === 1,
      totalSwapsCompleted: parseInt(data.totalSwapsCompleted || '0', 10),
    };
  } catch (error) {
    console.error('Failed to fetch market state:', error);
    return fallback;
  }
}

export async function fetchStoneDropState(): Promise<StoneDropState> {
  const fallback = createEmptyStoneDropState();

  if (!hasConfiguredContractAddress('stoneDrop')) {
    return fallback;
  }

  try {
    const response = await fetch(NETWORK.indexer, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          contractState(contractAddress: "${CONTRACTS.stoneDrop.address}") {
            data
          }
        }`,
      }),
    });

    const json = await response.json();
    const data = json?.data?.contractState?.data;
    if (!data) {
      return fallback;
    }

    return {
      totalDrops: parseInt(data.totalDrops || '0', 10),
      totalClaims: parseInt(data.totalClaims || '0', 10),
      revokedDrops: parseInt(data.revokedDrops || '0', 10),
    };
  } catch (error) {
    console.error('Failed to fetch stone drop state:', error);
    return fallback;
  }
}

export function disconnectWallet(): void {
  removeStorageItem(STORAGE_KEYS.walletAddress);
  removeStorageItem(STORAGE_KEYS.txHistory);
  removeStorageItem(STORAGE_KEYS.runnerName);
  removeStorageItem(STORAGE_KEYS.stoneDrops);
  window.location.reload();
}

export { MISSIONS, CONTRACTS, getRankForScore } from './contracts';
export type { MissionId } from './contracts';
export { getActiveModifiers, calculateFinalPoints } from './modifiers';
export type { Modifier } from './modifiers';
