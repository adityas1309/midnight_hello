import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../game/store';
import type { RemotePlayer, SwapOffer, NarrativeEvent, LeaderboardEntry } from '../game/store';

const SERVER_URL = import.meta.env?.VITE_SERVER_URL ?? 'http://localhost:4000';

class MultiplayerService {
  private socket: Socket | null = null;
  private lastPositionSendTime = 0;
  private connected = false;

  connect(walletAddress: string, runnerName: string, trailScore: number, rank: string): void {
    if (this.socket?.connected) {
      return;
    }
    if (this.socket) {
        this.socket.disconnect();
    }

    try {
      this.socket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        this.connected = true;
        console.log('[MP] Connected to server');

        this.socket?.emit('player_join', {
          walletAddress,
          runnerName,
          trailScore,
          rank,
        });
      });

      this.socket.on('connect_error', (err: Error) => {
        console.warn('[MP] Connection error — game continues in single-player mode:', err.message);
        this.connected = false;
      });

      this.socket.on('disconnect', () => {
        console.log('[MP] Disconnected from server');
        this.connected = false;
      });

      // ── World State (initial) ──
      this.socket.on('world_state', (data: {
        players: RemotePlayer[];
        chainAlertActive: boolean;
        activeOffers: SwapOffer[];
      }) => {
        const store = useGameStore.getState();
        store.setRemotePlayers(data.players);
        store.setChainAlert(data.chainAlertActive);
        store.setActiveOffers(data.activeOffers);
      });

      // ── Player Events ──
      this.socket.on('player_joined', (data: RemotePlayer) => {
        useGameStore.getState().addRemotePlayer(data);
      });

      this.socket.on('player_moved', (data: {
        socketId: string;
        x: number;
        z: number;
        direction: number;
        movementState: string;
        currentZone: string;
      }) => {
        useGameStore.getState().updateRemotePlayer(data.socketId, {
          x: data.x,
          z: data.z,
          direction: data.direction,
          movementState: data.movementState,
        });
      });

      this.socket.on('player_left', (data: { socketId: string }) => {
        useGameStore.getState().removeRemotePlayer(data.socketId);
      });

      // ── Swap Events ──
      this.socket.on('swap_offer_created', (data: SwapOffer) => {
        useGameStore.getState().addSwapOffer(data);
      });

      this.socket.on('swap_offer_removed', (data: { offerId: string }) => {
        useGameStore.getState().removeSwapOffer(data.offerId);
      });

      this.socket.on('swap_offer_waiting', (_data: Record<string, unknown>) => {
        useGameStore.getState().setSwapStatus('waiting', 'Your offer is posted. Waiting for a match...');
      });

      this.socket.on('swap_matched', (data: Record<string, unknown>) => {
        const store = useGameStore.getState();
        store.setSwapStatus('matched', 'Match found! Confirm the swap to proceed.');
        store.setPendingSwapMatch(data);
      });

      this.socket.on('swap_expired', (_data: Record<string, unknown>) => {
        const store = useGameStore.getState();
        store.setSwapStatus('idle', 'Swap expired — no confirmation received.');
        store.setPendingSwapMatch(null);
      });

      this.socket.on('swap_completed', (data: { offerId: string; txHash: string; message: string }) => {
        const store = useGameStore.getState();
        store.setSwapStatus('completed', data.message || 'Swap completed.');
        store.setPendingSwapMatch(null);
        // Reset to idle after 3 seconds
        setTimeout(() => {
          useGameStore.getState().setSwapStatus('idle', '');
        }, 3000);
      });

      this.socket.on('swap_error', (data: { message: string }) => {
        useGameStore.getState().setSwapStatus('idle', data.message);
      });

      // ── CHAIN Alert ──
      this.socket.on('chain_alert_changed', (data: { active: boolean }) => {
        useGameStore.getState().setChainAlert(data.active);
      });

      // ── Narrative Events ──
      this.socket.on('narrative_event', (data: NarrativeEvent) => {
        useGameStore.getState().pushNarrativeEvent(data);
      });

      // ── Leaderboard ──
      this.socket.on('leaderboard_update', (data: LeaderboardEntry) => {
        useGameStore.getState().updateLeaderboardEntry(data);
      });

    } catch (err) {
      console.warn('[MP] Failed to create socket connection — single-player mode:', err);
    }
  }

  sendPosition(x: number, z: number, direction: number, movementState: string, currentZone: string): void {
    if (!this.socket?.connected) return;

    // Throttle to max 10 emissions per second
    const now = Date.now();
    if (now - this.lastPositionSendTime < 100) return;
    this.lastPositionSendTime = now;

    this.socket.emit('player_move', { x, z, direction, movementState, currentZone });
  }

  createSwapOffer(offeredAsset: string, offeredAmount: number, wantedAsset: string, wantedAmount: number, zoneId: string): void {
    if (!this.socket?.connected) {
      useGameStore.getState().setSwapStatus('idle', 'Not connected to server.');
      return;
    }
    this.socket.emit('create_swap_offer', { offeredAsset, offeredAmount, wantedAsset, wantedAmount, zoneId });
  }

  acceptSwapOffer(offerId: string): void {
    if (!this.socket?.connected) {
      useGameStore.getState().setSwapStatus('idle', 'Not connected to server.');
      return;
    }
    this.socket.emit('accept_swap_offer', { offerId });
  }

  confirmSwapCompleted(offerId: string, txHash: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('swap_confirmed', { offerId, txHash });
  }

  triggerNarrative(type: string, zoneId: string, runnerName: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('narrative_trigger', { type, zoneId, runnerName });
  }

  updateScore(trailScore: number, rank: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('score_update', { trailScore, rank });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const multiplayerService = new MultiplayerService();
