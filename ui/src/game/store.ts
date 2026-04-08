import { create } from 'zustand';
import type { RunnerState } from '../services/gameState';
import { STORAGE_KEYS, readStorageItem, writeStorageItem } from '../services/storage';

export type MovementState = 'idle' | 'walk' | 'run' | 'sneak' | 'victory';
export type ActiveOverlay =
  | 'none'
  | 'mission_card'
  | 'mission_execution'
  | 'journal'
  | 'leaderboard'
  | 'market';

export interface TxRecord {
  txHash: string;
  missionType: string;
  points: number;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  description: string;
}

export interface RemotePlayer {
  socketId: string;
  walletAddress: string;
  runnerName: string;
  trailScore: number;
  rank: string;
  x: number;
  z: number;
  direction: number;
  movementState: string;
}

export interface NarrativeEvent {
  message: string;
  urgency: string;
  id: string;
  timestamp: number;
}

export interface SwapOffer {
  id: string;
  creatorName: string;
  offeredAsset: string;
  offeredAmount: number;
  wantedAsset: string;
  wantedAmount: number;
  zoneId: string;
}

export interface LeaderboardEntry {
  id: string;
  runnerName: string;
  trailScore: number;
  rank: string;
}

interface GameState {
  runnerWorldPos: { x: number; y: number };
  runnerDirection: number;
  movementState: MovementState;
  runnerInfo: RunnerState | null;
  sessionMissions: number;
  activeZoneId: string | null;
  activeOverlay: ActiveOverlay;
  walletAddress: string;
  txHistory: TxRecord[];
  remotePlayers: Map<string, RemotePlayer>;
  chainAlertActive: boolean;
  narrativeEvents: NarrativeEvent[];
  activeOffers: SwapOffer[];
  swapStatus: 'idle' | 'waiting' | 'matched' | 'completed';
  swapStatusMessage: string;
  pendingSwapMatch: Record<string, unknown> | null;
  liveLeaderboard: LeaderboardEntry[];
  setRunnerPos: (x: number, z: number, direction: number, movementState: MovementState) => void;
  setActiveZone: (zoneId: string | null) => void;
  setOverlay: (overlay: ActiveOverlay) => void;
  triggerVictory: () => void;
  setRunnerInfo: (info: RunnerState | null) => void;
  incrementSessionMissions: () => void;
  setWalletAddress: (address: string) => void;
  addTxRecord: (record: TxRecord) => void;
  updateTxStatus: (txHash: string, status: TxRecord['status']) => void;
  setRemotePlayers: (players: RemotePlayer[]) => void;
  addRemotePlayer: (player: RemotePlayer) => void;
  updateRemotePlayer: (id: string, data: Partial<RemotePlayer>) => void;
  removeRemotePlayer: (id: string) => void;
  setChainAlert: (active: boolean) => void;
  pushNarrativeEvent: (event: NarrativeEvent) => void;
  removeNarrativeEvent: (id: string) => void;
  setActiveOffers: (offers: SwapOffer[]) => void;
  addSwapOffer: (offer: SwapOffer) => void;
  removeSwapOffer: (offerId: string) => void;
  setSwapStatus: (status: GameState['swapStatus'], message: string) => void;
  setPendingSwapMatch: (match: Record<string, unknown> | null) => void;
  updateLeaderboardEntry: (entry: LeaderboardEntry) => void;
}

function hydrateWalletAddress(): string {
  return readStorageItem(STORAGE_KEYS.walletAddress) || '';
}

function hydrateTxHistory(): TxRecord[] {
  const saved = readStorageItem(STORAGE_KEYS.txHistory);
  if (!saved) {
    return [];
  }

  try {
    return JSON.parse(saved) as TxRecord[];
  } catch {
    return [];
  }
}

export const useGameStore = create<GameState>((set) => ({
  runnerWorldPos: { x: 0, y: 0 },
  runnerDirection: 0,
  movementState: 'idle',
  runnerInfo: null,
  sessionMissions: 0,
  activeZoneId: null,
  activeOverlay: 'none',
  walletAddress: hydrateWalletAddress(),
  txHistory: hydrateTxHistory(),
  remotePlayers: new Map(),
  chainAlertActive: false,
  narrativeEvents: [],
  activeOffers: [],
  swapStatus: 'idle',
  swapStatusMessage: '',
  pendingSwapMatch: null,
  liveLeaderboard: [],

  setRunnerPos: (x, z, direction, movementState) =>
    set({ runnerWorldPos: { x, y: z }, runnerDirection: direction, movementState }),

  setActiveZone: (zoneId) => set({ activeZoneId: zoneId }),
  setOverlay: (overlay) => set({ activeOverlay: overlay }),
  setRunnerInfo: (info) => set({ runnerInfo: info }),
  incrementSessionMissions: () =>
    set((state) => ({ sessionMissions: state.sessionMissions + 1 })),

  triggerVictory: () => {
    set({ movementState: 'victory' });
    setTimeout(() => {
      set((state) =>
        state.movementState === 'victory' ? { movementState: 'idle' } : {},
      );
    }, 3000);
  },

  setWalletAddress: (address) => {
    set({ walletAddress: address });
    writeStorageItem(STORAGE_KEYS.walletAddress, address);
  },

  addTxRecord: (record) => {
    set((state) => {
      const updated = [record, ...state.txHistory].slice(0, 50);
      writeStorageItem(STORAGE_KEYS.txHistory, JSON.stringify(updated));
      return { txHistory: updated };
    });
  },

  updateTxStatus: (txHash, status) => {
    set((state) => {
      const updated = state.txHistory.map((tx) =>
        tx.txHash === txHash ? { ...tx, status } : tx,
      );
      writeStorageItem(STORAGE_KEYS.txHistory, JSON.stringify(updated));
      return { txHistory: updated };
    });
  },

  setRemotePlayers: (players) => {
    const map = new Map<string, RemotePlayer>();
    players.forEach((player) => map.set(player.socketId, player));
    set({ remotePlayers: map });
  },

  addRemotePlayer: (player) => {
    set((state) => {
      const map = new Map(state.remotePlayers);
      map.set(player.socketId, player);
      return { remotePlayers: map };
    });
  },

  updateRemotePlayer: (id, data) => {
    set((state) => {
      const map = new Map(state.remotePlayers);
      const existing = map.get(id);
      if (existing) {
        map.set(id, { ...existing, ...data });
      }
      return { remotePlayers: map };
    });
  },

  removeRemotePlayer: (id) => {
    set((state) => {
      const map = new Map(state.remotePlayers);
      map.delete(id);
      return { remotePlayers: map };
    });
  },

  setChainAlert: (active) => set({ chainAlertActive: active }),

  pushNarrativeEvent: (event) => {
    set((state) => ({
      narrativeEvents: [event, ...state.narrativeEvents].slice(0, 5),
    }));
  },

  removeNarrativeEvent: (id) => {
    set((state) => ({
      narrativeEvents: state.narrativeEvents.filter((event) => event.id !== id),
    }));
  },

  setActiveOffers: (offers) => set({ activeOffers: offers }),

  addSwapOffer: (offer) => {
    set((state) => ({
      activeOffers: [...state.activeOffers, offer],
    }));
  },

  removeSwapOffer: (offerId) => {
    set((state) => ({
      activeOffers: state.activeOffers.filter((offer) => offer.id !== offerId),
    }));
  },

  setSwapStatus: (status, message) =>
    set({ swapStatus: status, swapStatusMessage: message }),

  setPendingSwapMatch: (match) => set({ pendingSwapMatch: match }),

  updateLeaderboardEntry: (entry) => {
    set((state) => {
      const existing = state.liveLeaderboard.filter((item) => item.id !== entry.id);
      const updated = [...existing, entry].sort(
        (left, right) => right.trailScore - left.trailScore,
      );
      return { liveLeaderboard: updated };
    });
  },
}));
