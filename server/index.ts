import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MidnightBech32m, ShieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import { nativeToken } from '@midnight-ntwrk/ledger-v8';
import { createWallet, ensureShieldedFunds, TEST_SEED, waitForSync } from '../src/utils.ts';

// ── Types ──

interface PlayerData {
  socketId: string;
  walletAddress: string;
  runnerName: string;
  trailScore: number;
  rank: string;
  x: number;
  z: number;
  direction: number;
  movementState: string;
  currentZone: string;
}

interface SwapOffer {
  id: string;
  creatorSocketId: string;
  creatorWallet: string;
  creatorName: string;
  offeredAsset: string;
  offeredAmount: number;
  wantedAsset: string;
  wantedAmount: number;
  zoneId: string;
  status: 'waiting' | 'matched' | 'completed' | 'cancelled';
  acceptorSocketId?: string;
  acceptorWallet?: string;
  acceptorName?: string;
  createdAt: number;
  timeoutId?: ReturnType<typeof setTimeout>;
}

interface CompletedSwap {
  offerId: string;
  creatorWallet: string;
  creatorName: string;
  acceptorWallet: string;
  acceptorName: string;
  offeredAsset: string;
  offeredAmount: number;
  wantedAsset: string;
  wantedAmount: number;
  txHash: string;
  completedAt: number;
}

// ── Narrative Templates ──

const NARRATIVE_TEMPLATES: Record<string, string[]> = {
  zone_enter: [
    '{runner} slips into the {zone} — the canopy closes behind.',
    'A shadow moves through {zone}. {runner} is on the trail.',
    'The forest whispers: {runner} has entered {zone}.',
    '{runner} crosses the boundary into {zone}. The air grows thick.',
  ],
  mission_complete: [
    '{runner} emerges from the mission clearing, trail score rising.',
    'The CHAIN drones lost {runner}\'s signal. Mission accomplished.',
    '{runner} carved another notch in the old oak. The forest remembers.',
    'A pulse of green light — {runner} has completed the run.',
  ],
  swap_created: [
    '{runner} carved a contract into the riverbank stone.',
    'A new offer appears at the river crossing — {runner} is trading.',
    'The water carries {runner}\'s offer downstream.',
    '{runner} placed a shielded contract at the river bend.',
  ],
  swap_completed: [
    'Two shadows met at the river. The swap is sealed.',
    'The river witnessed a crossing — tokens changed hands in silence.',
    'A private exchange completed beneath the forest canopy.',
    'The contract dissolved into the water. Both parties walk free.',
  ],
};

// ── Data Persistence ──

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const SWAPS_FILE = path.join(DATA_DIR, 'swaps.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadSwapHistory(): CompletedSwap[] {
  try {
    if (fs.existsSync(SWAPS_FILE)) {
      const raw = fs.readFileSync(SWAPS_FILE, 'utf-8');
      return JSON.parse(raw) as CompletedSwap[];
    }
  } catch (e) {
    console.error('Failed to load swap history:', e);
  }
  return [];
}

function saveSwapHistory(swaps: CompletedSwap[]): void {
  try {
    fs.writeFileSync(SWAPS_FILE, JSON.stringify(swaps, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save swap history:', e);
  }
}

// ── CHAIN Alert Logic ──

function isChainAlertActive(): boolean {
  const now = new Date();
  const hour = now.getUTCHours();
  const minutes = now.getUTCMinutes();
  return hour % 3 === 0 && minutes < 30;
}

function pickNarrative(type: string, runner: string, zone: string = ''): string {
  const templates = NARRATIVE_TEMPLATES[type] || NARRATIVE_TEMPLATES.zone_enter;
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template.replace('{runner}', runner).replace('{zone}', zone);
}

// ── Server Setup ──

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ── State ──

const players = new Map<string, PlayerData>();
const swapOffers = new Map<string, SwapOffer>();
let swapHistory: CompletedSwap[] = [];
let lastChainAlertState = isChainAlertActive();
let nextOfferId = 1;

// ── REST Endpoints ──

app.get('/api/swaps', (_req, res) => {
  const sorted = [...swapHistory]
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, 100);
  res.json(sorted);
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', players: players.size, offers: swapOffers.size });
});

app.post('/api/midnight/shielded-transfer', async (req, res) => {
  const walletCtx = await createWallet(TEST_SEED);

  try {
    const transfersInput = Array.isArray(req.body?.transfers) ? req.body.transfers : [];
    if (transfersInput.length === 0) {
      res.status(400).json({ error: 'At least one transfer is required.' });
      return;
    }

    const transfers = transfersInput.map((transfer: { address?: unknown; amount?: unknown }) => {
      if (typeof transfer?.address !== 'string' || transfer.address.trim().length === 0) {
        throw new Error('Each transfer must include a shielded recipient address.');
      }

      const amount = BigInt(transfer.amount);
      if (amount <= 0n) {
        throw new Error('Each transfer amount must be greater than zero.');
      }

      return {
        receiverAddress: MidnightBech32m.parse(transfer.address.trim()).decode(ShieldedAddress, 'undeployed'),
        amount,
      };
    });

    const totalAmount = transfers.reduce((sum, transfer) => sum + transfer.amount, 0n);

    await waitForSync(walletCtx);
    await ensureShieldedFunds(walletCtx, totalAmount);

    const recipe = await walletCtx.wallet.transferTransaction(
      [{
        type: 'shielded',
        outputs: transfers.map((transfer) => ({
          type: nativeToken().raw,
          receiverAddress: transfer.receiverAddress,
          amount: transfer.amount,
        })),
      }],
      {
        shieldedSecretKeys: walletCtx.shieldedSecretKeys,
        dustSecretKey: walletCtx.dustSecretKey,
      },
      {
        ttl: new Date(Date.now() + 30 * 60 * 1000),
        payFees: true,
      },
    );

    const finalized = await walletCtx.wallet.finalizeTransaction(recipe.transaction);
    const txId = await walletCtx.wallet.submitTransaction(finalized);

    res.json({
      txId: String(txId),
      transferCount: transfers.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[server] shielded-transfer failed:', error);
    res.status(500).json({ error: message });
  } finally {
    await walletCtx.wallet.stop();
  }
});

// ── CHAIN Alert Interval ──

setInterval(() => {
  const currentState = isChainAlertActive();
  if (currentState !== lastChainAlertState) {
    lastChainAlertState = currentState;
    io.emit('chain_alert_changed', { active: currentState });
  }
}, 10_000);

// ── Socket.io Connection Handler ──

io.on('connection', (socket: Socket) => {
  console.log(`[CONNECT] ${socket.id}`);

  // ── Player Join ──
  socket.on('player_join', (data: {
    walletAddress: string;
    runnerName: string;
    trailScore: number;
    rank: string;
  }) => {
    // Prevent duplicate connections from the same wallet across tabs
    if (data.walletAddress) {
      for (const [existingSocketId, existingPlayer] of players.entries()) {
        if (existingPlayer.walletAddress === data.walletAddress) {
          const oldSocket = io.sockets.sockets.get(existingSocketId);
          if (oldSocket) {
            oldSocket.disconnect(true);
          }
        }
      }
    }

    const player: PlayerData = {
      socketId: socket.id,
      walletAddress: data.walletAddress,
      runnerName: data.runnerName || 'Unknown Runner',
      trailScore: data.trailScore || 0,
      rank: data.rank || 'Seedling',
      x: 0,
      z: 0,
      direction: 0,
      movementState: 'idle',
      currentZone: '',
    };

    players.set(socket.id, player);

    // Send world state to the joining player
    const allPlayers = Array.from(players.values()).filter(p => p.socketId !== socket.id);
    const activeOffers = Array.from(swapOffers.values())
      .filter(o => o.status === 'waiting')
      .map(o => ({
        id: o.id,
        creatorName: o.creatorName,
        offeredAsset: o.offeredAsset,
        offeredAmount: o.offeredAmount,
        wantedAsset: o.wantedAsset,
        wantedAmount: o.wantedAmount,
        zoneId: o.zoneId,
      }));

    socket.emit('world_state', {
      players: allPlayers,
      chainAlertActive: isChainAlertActive(),
      activeOffers,
    });

    // Broadcast to everyone else
    socket.broadcast.emit('player_joined', {
      socketId: socket.id,
      walletAddress: player.walletAddress,
      runnerName: player.runnerName,
      trailScore: player.trailScore,
      rank: player.rank,
      x: player.x,
      z: player.z,
      direction: player.direction,
      movementState: player.movementState,
    });
  });

  // ── Player Movement ──
  socket.on('player_move', (data: {
    x: number;
    z: number;
    direction: number;
    movementState: string;
    currentZone: string;
  }) => {
    const player = players.get(socket.id);
    if (!player) return;

    player.x = data.x;
    player.z = data.z;
    player.direction = data.direction;
    player.movementState = data.movementState;
    player.currentZone = data.currentZone;

    socket.broadcast.emit('player_moved', {
      socketId: socket.id,
      x: data.x,
      z: data.z,
      direction: data.direction,
      movementState: data.movementState,
      currentZone: data.currentZone,
    });
  });

  // ── Score Update ──
  socket.on('score_update', (data: { trailScore: number; rank: string }) => {
    const player = players.get(socket.id);
    if (!player) return;

    player.trailScore = data.trailScore;
    player.rank = data.rank;

    io.emit('leaderboard_update', {
      id: socket.id,
      runnerName: player.runnerName,
      trailScore: data.trailScore,
      rank: data.rank,
    });
  });

  // ── Narrative Trigger ──
  socket.on('narrative_trigger', (data: {
    type: string;
    zoneId: string;
    runnerName: string;
  }) => {
    const message = pickNarrative(data.type, data.runnerName, data.zoneId);
    const urgency = data.type === 'mission_complete' ? 'high' : 'low';

    socket.broadcast.emit('narrative_event', {
      message,
      urgency,
      id: `nar_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    });
  });

  // ── P2P Swap: Create Offer ──
  socket.on('create_swap_offer', (data: {
    offeredAsset: string;
    offeredAmount: number;
    wantedAsset: string;
    wantedAmount: number;
    zoneId: string;
  }) => {
    const player = players.get(socket.id);
    if (!player) {
      socket.emit('swap_error', { message: 'Player not registered.' });
      return;
    }

    if (player.currentZone !== 'river_crossing') {
      socket.emit('swap_error', { message: 'You must be at the River Crossing to create swap offers.' });
      return;
    }

    const offerId = `swap_${nextOfferId++}`;
    const offer: SwapOffer = {
      id: offerId,
      creatorSocketId: socket.id,
      creatorWallet: player.walletAddress,
      creatorName: player.runnerName,
      offeredAsset: data.offeredAsset,
      offeredAmount: data.offeredAmount,
      wantedAsset: data.wantedAsset,
      wantedAmount: data.wantedAmount,
      zoneId: data.zoneId,
      status: 'waiting',
      createdAt: Date.now(),
    };

    swapOffers.set(offerId, offer);

    // Notify creator
    socket.emit('swap_offer_waiting', {
      id: offerId,
      offeredAsset: offer.offeredAsset,
      offeredAmount: offer.offeredAmount,
      wantedAsset: offer.wantedAsset,
      wantedAmount: offer.wantedAmount,
    });

    // Broadcast to all
    io.emit('swap_offer_created', {
      id: offerId,
      creatorName: offer.creatorName,
      offeredAsset: offer.offeredAsset,
      offeredAmount: offer.offeredAmount,
      wantedAsset: offer.wantedAsset,
      wantedAmount: offer.wantedAmount,
      zoneId: offer.zoneId,
    });
  });

  // ── P2P Swap: Accept Offer ──
  socket.on('accept_swap_offer', (data: { offerId: string }) => {
    const offer = swapOffers.get(data.offerId);
    const acceptor = players.get(socket.id);

    if (!offer) {
      socket.emit('swap_error', { message: 'Offer not found.' });
      return;
    }

    if (!acceptor) {
      socket.emit('swap_error', { message: 'Player not registered.' });
      return;
    }

    if (offer.creatorSocketId === socket.id) {
      socket.emit('swap_error', { message: 'You cannot accept your own offer.' });
      return;
    }

    if (acceptor.currentZone !== 'river_crossing') {
      socket.emit('swap_error', { message: 'You must be at the River Crossing to accept offers.' });
      return;
    }

    if (offer.status !== 'waiting') {
      socket.emit('swap_error', { message: 'This offer is no longer available.' });
      return;
    }

    // Match!
    offer.status = 'matched';
    offer.acceptorSocketId = socket.id;
    offer.acceptorWallet = acceptor.walletAddress;
    offer.acceptorName = acceptor.runnerName;

    const matchData = {
      offerId: offer.id,
      creatorWallet: offer.creatorWallet,
      creatorName: offer.creatorName,
      acceptorWallet: acceptor.walletAddress,
      acceptorName: acceptor.runnerName,
      offeredAsset: offer.offeredAsset,
      offeredAmount: offer.offeredAmount,
      wantedAsset: offer.wantedAsset,
      wantedAmount: offer.wantedAmount,
    };

    // Notify both parties
    const creatorSocket = io.sockets.sockets.get(offer.creatorSocketId);
    if (creatorSocket) {
      creatorSocket.emit('swap_matched', matchData);
    }
    socket.emit('swap_matched', matchData);

    // Remove from public offers
    io.emit('swap_offer_removed', { offerId: offer.id });

    // 30 second timeout for confirmation
    offer.timeoutId = setTimeout(() => {
      if (offer.status === 'matched') {
        offer.status = 'cancelled';
        const creator = io.sockets.sockets.get(offer.creatorSocketId);
        const acc = offer.acceptorSocketId ? io.sockets.sockets.get(offer.acceptorSocketId) : null;
        if (creator) creator.emit('swap_expired', { offerId: offer.id });
        if (acc) acc.emit('swap_expired', { offerId: offer.id });
        swapOffers.delete(offer.id);
      }
    }, 30_000);
  });

  // ── P2P Swap: Confirm Completed ──
  socket.on('swap_confirmed', (data: { offerId: string; txHash: string }) => {
    const offer = swapOffers.get(data.offerId);
    if (!offer) return;

    if (offer.timeoutId) {
      clearTimeout(offer.timeoutId);
    }

    offer.status = 'completed';

    const completed: CompletedSwap = {
      offerId: offer.id,
      creatorWallet: offer.creatorWallet,
      creatorName: offer.creatorName,
      acceptorWallet: offer.acceptorWallet || '',
      acceptorName: offer.acceptorName || '',
      offeredAsset: offer.offeredAsset,
      offeredAmount: offer.offeredAmount,
      wantedAsset: offer.wantedAsset,
      wantedAmount: offer.wantedAmount,
      txHash: data.txHash,
      completedAt: Date.now(),
    };

    swapHistory.push(completed);
    saveSwapHistory(swapHistory);

    io.emit('swap_completed', {
      offerId: offer.id,
      txHash: data.txHash,
      message: pickNarrative('swap_completed', offer.creatorName),
    });

    swapOffers.delete(offer.id);
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    console.log(`[DISCONNECT] ${socket.id} (${player?.runnerName || 'unknown'})`);

    // Cancel any pending offers from this player
    for (const [offerId, offer] of swapOffers.entries()) {
      if (offer.creatorSocketId === socket.id && offer.status === 'waiting') {
        if (offer.timeoutId) clearTimeout(offer.timeoutId);
        swapOffers.delete(offerId);
        io.emit('swap_offer_removed', { offerId });
      }
    }

    // Remove player
    players.delete(socket.id);

    // Broadcast
    socket.broadcast.emit('player_left', {
      socketId: socket.id,
      runnerName: player?.runnerName || 'Unknown',
    });
  });
});

// ── Start Server ──

const PORT = parseInt(process.env.PORT || '4000', 10);

ensureDataDir();
swapHistory = loadSwapHistory();

httpServer.listen(PORT, () => {
  console.log(`🌿 Shadow Run server running on port ${PORT}`);
  console.log(`   CHAIN alert active: ${isChainAlertActive()}`);
  console.log(`   Swap history: ${swapHistory.length} completed swaps`);
});
