import { useState, useEffect, useRef } from 'react';
import { MISSIONS, getTransactionUrl, type MissionId } from '../services/contracts';
import { getActiveModifiers, calculateFinalPoints } from '../services/modifiers';
import { getRankForScore } from '../services/contracts';
import { useGameStore } from '../game/store';
import { multiplayerService } from '../services/multiplayer';
import * as contractService from '../services/contractService';
import { STORAGE_KEYS, readStorageItem, writeStorageItem } from '../services/storage';

interface Props {
  missionId: MissionId;
}

type Stage = 'briefing' | 'setup' | 'crossing' | 'clearing' | 'stone_secret' | 'stone_confirm';

// Mission-complete narrative lines — rotate deterministically
const MISSION_NARRATIVES = [
  'No address. No history. No trace. The forest sealed your transaction.',
  "CHAIN's drones scanned the canopy. They found nothing. You are a ghost.",
  'The river carried your trail downstream. Not even the water remembers the direction.',
  'Another stone carved. Another score on the monument. Your wallet remains invisible.',
  'The deep forest protected you. Your transaction exists. Your identity does not.',
];

function shortenHash(hash: string): string {
  if (hash.length <= 19) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

export default function MissionExecution({ missionId }: Props) {
  const { runnerInfo, sessionMissions, setOverlay, incrementSessionMissions } = useGameStore();
  const missionExecutionStartedRef = useRef(false);

  const [stage, setStage] = useState<Stage>('briefing');
  const [progress, setProgress] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [contractLoading, setContractLoading] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);

  // Stone Drop state
  const [stoneSecret, setStoneSecret] = useState('');
  const [stoneRandomness, setStoneRandomness] = useState('');
  const [ghostRecipient, setGhostRecipient] = useState('');
  const [canopyRecipients, setCanopyRecipients] = useState(['', '', '']);

  const mission = MISSIONS[missionId];
  const modifiers = getActiveModifiers(mission.difficulty, sessionMissions, true);
  const { total, breakdown } = calculateFinalPoints(mission.basePoints, modifiers);

  const isStoneDropMission = missionId === 'stone_drop';
  const isGhostTrailMission = missionId === 'ghost_trail';
  const isCanopySplitMission = missionId === 'canopy_split';

  // Narrative line for mission complete (deterministic rotation)
  const narrativeLine = MISSION_NARRATIVES[(runnerInfo?.totalMissions || 0) % MISSION_NARRATIVES.length];

  // Handle real contract call for mission completion
  const executeContractCall = async () => {
    if (missionExecutionStartedRef.current || contractLoading) {
      return;
    }

    missionExecutionStartedRef.current = true;
    setContractLoading(true);
    setContractError(null);

    try {
      const walletApi = await contractService.getConnectedWalletApi();
      const currentScore = runnerInfo?.trailScore || 0;
      const currentWeekly = runnerInfo?.weeklyScore || 0;
      const currentRank = runnerInfo?.currentRank || 'Seedling';
      let primaryTxId: string;

      if (isGhostTrailMission) {
        const recipientAddress = ghostRecipient.trim();
        if (!recipientAddress) {
          throw new Error('Enter a recipient shielded address for Ghost Trail.');
        }

        const result = await contractService.executeGhostTrail(
          walletApi,
          recipientAddress,
          100_000_000n,
          total,
          currentScore,
          currentWeekly,
          currentRank
        );
        primaryTxId = result.transferTxId;
      } else if (isCanopySplitMission) {
        const cleanedRecipients = canopyRecipients.map((value) => value.trim());
        if (cleanedRecipients.some((value) => !value)) {
          throw new Error('Enter all 3 recipient shielded addresses for Canopy Split.');
        }

        const result = await contractService.executeCanopySplit(
          walletApi,
          cleanedRecipients.map((address) => ({ address, amount: 100_000_000n })),
          total,
          currentScore,
          currentWeekly,
          currentRank
        );
        primaryTxId = result.transferTxId;
      } else {
        const result = await contractService.completeMission(
          walletApi,
          missionId,
          total,
          currentScore,
          currentWeekly,
          currentRank
        );
        primaryTxId = result.txId;
      }

      setTxHash(primaryTxId);

      const store = useGameStore.getState();
      store.addTxRecord({
        txHash: primaryTxId,
        missionType: missionId,
        points: total,
        timestamp: Date.now(),
        status: 'pending',
        description: `${mission.name} — earned ${total} trail points`,
      });

      // Trigger narrative event
      multiplayerService.triggerNarrative('mission_complete', missionId, runnerInfo?.runnerName || 'Runner');

      // Update server score
      const newScore = (runnerInfo?.trailScore || 0) + total;
      const newRank = getRankForScore(newScore);
      multiplayerService.updateScore(newScore, newRank.rank);

      // Auto-confirm after 5 seconds
      setTimeout(() => {
        useGameStore.getState().updateTxStatus(primaryTxId, 'confirmed');
      }, 5000);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setContractError(message);
      missionExecutionStartedRef.current = false;
    } finally {
      setContractLoading(false);
    }
  };

  // Handle stone drop deposit
  const executeStoneDropDeposit = async () => {
    setContractLoading(true);
    setContractError(null);

    try {
      const walletApi = await contractService.getConnectedWalletApi();
      const result = await contractService.depositStoneDrop(
        walletApi,
        stoneSecret,
        stoneRandomness,
        10_000_000n
      );

      setTxHash(result.txId);

      const existingRaw = readStorageItem(STORAGE_KEYS.stoneDrops);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      existing.push({
        secret: stoneSecret,
        randomness: stoneRandomness,
        txHash: result.txId,
        timestamp: Date.now(),
        claimed: false,
      });
      writeStorageItem(STORAGE_KEYS.stoneDrops, JSON.stringify(existing));

      const store = useGameStore.getState();
      store.addTxRecord({
        txHash: result.txId,
        missionType: 'stone_drop',
        points: total,
        timestamp: Date.now(),
        status: 'pending',
        description: `Stone Drop — secret deposited on-chain`,
      });

      // Auto-confirm after 5 seconds
      setTimeout(() => {
        useGameStore.getState().updateTxStatus(result.txId, 'confirmed');
      }, 5000);

      setStage('stone_confirm');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setContractError(message);
    } finally {
      setContractLoading(false);
    }
  };

  // Auto-advance through stages
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (stage === 'setup') {
      // Simulate ZK proof generation (roots animation) — 4 seconds
      timers.push(setTimeout(() => setStage('crossing'), 4000));
    }
    if (stage === 'crossing') {
      // Simulate block confirmations — progress ticks
      const TOTAL_BLOCKS = 6;
      let block = 0;
      const interval = setInterval(() => {
        block++;
        setProgress(Math.min((block / TOTAL_BLOCKS) * 100, 100));
        if (block >= TOTAL_BLOCKS) {
          clearInterval(interval);
          setTimeout(() => {
            setStage('clearing');
            // Trigger the real contract call
            executeContractCall();
          }, 600);
        }
      }, 800);
      timers.push(interval as unknown as ReturnType<typeof setTimeout>);
    }

    return () => timers.forEach(t => clearTimeout(t));
  }, [stage]);

  // Time tracker
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => setElapsedMs(Date.now() - start), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsedSec = Math.floor(elapsedMs / 1000);
  const newScore = (runnerInfo?.trailScore || 0) + total;
  const newRank = getRankForScore(newScore);
  const rankChanged = newRank.rank !== runnerInfo?.currentRank;
  const txUrl = txHash ? getTransactionUrl(txHash) : null;

  // Handle stone drop: Generate secret step
  const handleGenerateSecret = () => {
    const secret = contractService.generateBytes32Hex();
    const randomness = contractService.generateBytes32Hex();
    setStoneSecret(secret);
    setStoneRandomness(randomness);
    setStage('stone_secret');
  };

  const handleCanopyRecipientChange = (index: number, value: string) => {
    const next = [...canopyRecipients];
    next[index] = value;
    setCanopyRecipients(next);
  };

  return (
    <div className="execution">
      <div className="execution__content">

        {/* ═══ Stage 1: Briefing ═══ */}
        {stage === 'briefing' && (
          <>
            <p className="execution__stage-title">📜 Mission Briefing</p>
            <div className="execution__tablet">
              <p style={{ fontSize: '1.4rem', marginBottom: 16 }}>{mission.icon}</p>
              <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.2rem', marginBottom: 12, color: 'var(--color-gold)' }}>
                {mission.name}
              </h3>
              <p className="execution__tablet-text">
                {mission.narrative}
              </p>
              <p style={{ marginTop: 16, fontSize: '0.85rem', opacity: 0.7 }}>
                Estimated reward: ~{total} trail points
              </p>
              {isGhostTrailMission && (
                <div style={{ marginTop: 18, textAlign: 'left' }}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                    Recipient shielded address
                  </label>
                  <input
                    value={ghostRecipient}
                    onChange={(event) => setGhostRecipient(event.target.value)}
                    placeholder="mn_shield-addr_..."
                    style={{
                      width: '100%',
                      padding: 10,
                      background: 'rgba(0,0,0,0.35)',
                      border: '1px solid rgba(212,167,69,0.25)',
                      borderRadius: 6,
                      color: 'var(--color-parchment)',
                      boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ marginTop: 8, fontSize: '0.78rem', opacity: 0.8 }}>
                    A real private transfer will be submitted before score is recorded.
                  </p>
                </div>
              )}
              {isCanopySplitMission && (
                <div style={{ marginTop: 18, textAlign: 'left' }}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                    Three recipient shielded addresses
                  </label>
                  {canopyRecipients.map((recipient, index) => (
                    <input
                      key={index}
                      value={recipient}
                      onChange={(event) => handleCanopyRecipientChange(index, event.target.value)}
                      placeholder={`Recipient ${index + 1} - mn_shield-addr_...`}
                      style={{
                        width: '100%',
                        padding: 10,
                        marginBottom: index === canopyRecipients.length - 1 ? 0 : 8,
                        background: 'rgba(0,0,0,0.35)',
                        border: '1px solid rgba(212,167,69,0.25)',
                        borderRadius: 6,
                        color: 'var(--color-parchment)',
                        boxSizing: 'border-box',
                      }}
                    />
                  ))}
                  <p style={{ marginTop: 8, fontSize: '0.78rem', opacity: 0.8 }}>
                    One real private multi-output send will be submitted before score is recorded.
                  </p>
                </div>
              )}
            </div>
            <div style={{ marginTop: 24, display: 'flex', gap: 16, justifyContent: 'center' }}>
              {isStoneDropMission ? (
                <button className="btn btn--primary" onClick={handleGenerateSecret}>
                  🪨 Generate Your Secret
                </button>
              ) : (
                <button
                  className="btn btn--primary"
                  onClick={() => setStage('setup')}
                  disabled={
                    (isGhostTrailMission && ghostRecipient.trim().length === 0) ||
                    (isCanopySplitMission && canopyRecipients.some((value) => value.trim().length === 0))
                  }
                >
                  🌿 Begin the Run
                </button>
              )}
              <button className="btn btn--secondary" onClick={() => setOverlay('none')} style={{ color: 'var(--color-parchment-dark)', borderColor: 'rgba(255,255,255,0.2)' }}>
                Retreat
              </button>
            </div>
          </>
        )}

        {/* ═══ Stone Drop: Secret Generation ═══ */}
        {stage === 'stone_secret' && (
          <>
            <p className="execution__stage-title">🪨 Your Secret Stone Carving</p>
            <div style={{
              padding: 20,
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 8,
              border: '1px solid rgba(212,167,69,0.3)',
              marginBottom: 16,
            }}>
              <p style={{
                fontSize: '0.85rem',
                color: '#e85040',
                fontFamily: 'Crimson Text, serif',
                fontStyle: 'italic',
                marginBottom: 16,
                lineHeight: 1.6,
              }}>
                ⚠️ Store this secret. It is the only way to claim or revoke this drop.
                Shadow Run does not store it.
              </p>
              <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                Secret (64 hex characters)
              </label>
              <textarea
                readOnly
                value={stoneSecret}
                style={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  padding: 8,
                  background: 'rgba(0,0,0,0.4)',
                  color: '#6bbd6b',
                  border: '1px solid rgba(74,122,74,0.3)',
                  borderRadius: 4,
                  resize: 'none',
                  height: 48,
                  boxSizing: 'border-box',
                }}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
              <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block', marginTop: 12, marginBottom: 4 }}>
                Randomness
              </label>
              <textarea
                readOnly
                value={stoneRandomness}
                style={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  padding: 8,
                  background: 'rgba(0,0,0,0.4)',
                  color: '#6bbd6b',
                  border: '1px solid rgba(74,122,74,0.3)',
                  borderRadius: 4,
                  resize: 'none',
                  height: 48,
                  boxSizing: 'border-box',
                }}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
            </div>

            {contractError && (
              <p style={{
                fontSize: '0.85rem',
                color: '#e85040',
                padding: '10px 16px',
                background: 'rgba(180,40,20,0.15)',
                borderRadius: 8,
                border: '1px solid rgba(180,40,20,0.3)',
                marginBottom: 12,
              }}>
                {contractError}
              </p>
            )}

            {contractLoading ? (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <div style={{ fontSize: 28, animation: 'pulse 1.5s ease-in-out infinite' }}>🪨</div>
                <p style={{
                  fontFamily: 'Crimson Text, serif',
                  fontStyle: 'italic',
                  fontSize: '0.9rem',
                  color: '#a0b890',
                  marginTop: 8,
                }}>
                  Sealing your secret into the ancient stone... ZK proof generating... (20–60 seconds)
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn btn--gold" onClick={executeStoneDropDeposit}>
                  🪨 Carve into the Stone
                </button>
                <button className="btn btn--secondary" onClick={() => setOverlay('none')} style={{ color: 'var(--color-parchment-dark)', borderColor: 'rgba(255,255,255,0.2)' }}>
                  Cancel
                </button>
              </div>
            )}
          </>
        )}

        {/* ═══ Stone Drop: Confirmation ═══ */}
        {stage === 'stone_confirm' && (
          <div className="execution__clearing">
            <p style={{ fontSize: '1.4rem', marginBottom: 8 }}>🪨</p>
            <p className="execution__stage-title">SECRET SEALED</p>

            <p style={{
              fontFamily: 'Crimson Text, serif',
              fontStyle: 'italic',
              fontSize: '0.95rem',
              color: 'rgba(160, 184, 144, 0.85)',
              marginBottom: 16,
              maxWidth: 400,
              margin: '0 auto 16px',
            }}>
              {narrativeLine}
            </p>

            {txHash && (
              <div style={{
                padding: '8px 12px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 6,
                border: '1px solid rgba(74,122,74,0.3)',
                textAlign: 'center',
                marginBottom: 12,
              }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  Transaction Hash
                </div>
                {txUrl ? (
                <a
                  href={txUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.82rem',
                    color: '#6bbd6b',
                    textDecoration: 'none',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {shortenHash(txHash)} ↗
                </a>
                ) : (
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.82rem',
                      color: '#6bbd6b',
                    }}
                  >
                    {shortenHash(txHash)}
                  </span>
                )}
              </div>
            )}

            <div style={{
              padding: 12,
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 8,
              border: '1px solid rgba(212,167,69,0.3)',
              marginBottom: 16,
            }}>
              <label style={{ fontSize: '0.72rem', color: '#d4a745', display: 'block', marginBottom: 4 }}>
                Your secret (save this!)
              </label>
              <textarea
                readOnly
                value={stoneSecret}
                style={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '0.7rem',
                  padding: 8,
                  background: 'rgba(0,0,0,0.4)',
                  color: '#6bbd6b',
                  border: '1px solid rgba(74,122,74,0.3)',
                  borderRadius: 4,
                  resize: 'none',
                  height: 40,
                  boxSizing: 'border-box',
                }}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
            </div>

            <button
              className="btn btn--gold"
              onClick={() => {
                incrementSessionMissions();
                setOverlay('none');
              }}
              style={{ marginTop: 8, padding: '12px 32px' }}
            >
              🌿 Return to the Map
            </button>
          </div>
        )}

        {/* ═══ Stage 2: Trail Setup — ZK Proof Generation ═══ */}
        {stage === 'setup' && (
          <>
            <p className="execution__stage-title">🌳 Generating ZK Proof...</p>
            <div className="execution__roots" style={{ position: 'relative' }}>
              {/* Animated root lines spreading */}
              {[
                { angle: -60, height: 90 },
                { angle: -30, height: 120 },
                { angle: 0, height: 100 },
                { angle: 30, height: 110 },
                { angle: 60, height: 80 },
              ].map((root, i) => (
                <div
                  key={i}
                  className="execution__root-line"
                  style={{
                    '--root-height': `${root.height}px`,
                    transform: `rotate(${root.angle}deg)`,
                    animationDelay: `${i * 300}ms`,
                  } as React.CSSProperties}
                />
              ))}

              {/* Center node */}
              <div style={{
                position: 'absolute',
                bottom: '50%',
                left: '50%',
                transform: 'translate(-50%, 50%)',
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--color-forest-glow)',
                boxShadow: '0 0 20px rgba(107, 189, 107, 0.6)',
                animation: 'nodeGlow 1.5s ease-in-out infinite',
              }} />
            </div>
            <p className="execution__status-text">
              The forest is hiding your trail... roots are spreading...
            </p>
          </>
        )}

        {/* ═══ Stage 3: Crossing — Block Confirmations ═══ */}
        {stage === 'crossing' && (
          <>
            <p className="execution__stage-title">
              {mission.icon} {mission.name} — Crossing
            </p>

            {/* CHAIN Drone */}
            <div style={{ position: 'relative', height: 30 }}>
              <span className="execution__chain-drone">📡</span>
            </div>

            {/* Vine progress bar */}
            <div className="execution__vine-track">
              <div
                className="execution__vine-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Block segments */}
            <div className="execution__vine-segments">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className={`execution__vine-segment ${
                    progress >= ((i + 1) / 6) * 100 ? 'execution__vine-segment--filled' : ''
                  }`}
                />
              ))}
            </div>

            <p style={{ marginTop: 16, fontSize: '0.85rem', opacity: 0.6 }}>
              Block confirmations: {Math.min(Math.floor(progress / (100 / 6)), 6)}/6
            </p>
            <p className="execution__status-text" style={{ marginTop: 8 }}>
              CHAIN drone scanning overhead — the canopy covers your trail...
            </p>
          </>
        )}

        {/* ═══ Stage 4: Clearing — Mission Complete ═══ */}
        {stage === 'clearing' && (
          <div className="execution__clearing">
            {/* Contract call loading */}
            {contractLoading && (
              <>
                <div style={{ fontSize: 28, animation: 'pulse 1.5s ease-in-out infinite', marginBottom: 12 }}>🌿</div>
                <p className="execution__stage-title">SEALING YOUR TRAIL</p>
                <p style={{
                  fontFamily: 'Crimson Text, serif',
                  fontStyle: 'italic',
                  fontSize: '0.95rem',
                  color: '#a0b890',
                  marginTop: 12,
                  maxWidth: 400,
                  margin: '12px auto 0',
                }}>
                  Sealing your trail on Midnight... ZK proof generating... (20–60 seconds)
                </p>
              </>
            )}

            {/* Contract call error */}
            {contractError && !contractLoading && (
              <>
                <p style={{ fontSize: '1.4rem', marginBottom: 8 }}>⚠️</p>
                <p className="execution__stage-title">TRAIL DISRUPTED</p>
                <p style={{
                  fontSize: '0.85rem',
                  color: '#e85040',
                  padding: '10px 16px',
                  background: 'rgba(180,40,20,0.15)',
                  borderRadius: 8,
                  border: '1px solid rgba(180,40,20,0.3)',
                  marginTop: 16,
                  maxWidth: 440,
                  margin: '16px auto',
                  lineHeight: 1.5,
                }}>
                  {contractError}
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
                  <button className="btn btn--primary" onClick={executeContractCall}>
                    🔄 Retry
                  </button>
                  <button className="btn btn--secondary" onClick={() => setOverlay('none')} style={{ color: 'var(--color-parchment-dark)', borderColor: 'rgba(255,255,255,0.2)' }}>
                    Retreat
                  </button>
                </div>
              </>
            )}

            {/* Contract call success */}
            {txHash && !contractLoading && !contractError && (
              <>
                <p style={{ fontSize: '1.4rem', marginBottom: 8 }}>☀️</p>
                <p className="execution__stage-title">MISSION COMPLETE</p>

                {/* Narrative line */}
                <p style={{
                  fontFamily: 'Crimson Text, serif',
                  fontStyle: 'italic',
                  fontSize: '0.95rem',
                  color: 'rgba(160, 184, 144, 0.85)',
                  marginBottom: 16,
                  maxWidth: 400,
                  margin: '0 auto 16px',
                }}>
                  {narrativeLine}
                </p>

                <div className="execution__score-earned">
                  +{total}
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-parchment-dark)', marginBottom: 24 }}>
                  Trail Points Earned
                </p>

                {/* Modifier breakdown */}
                <div className="execution__modifier-breakdown">
                  {breakdown.map((item, i) => (
                    <div key={i} className="execution__modifier-line">
                      <span>{item.name}</span>
                      <span className={i > 0 ? 'execution__modifier-bonus' : ''}>
                        {i === 0 ? '' : '+'}{item.bonus}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Transaction Hash Display */}
                <div style={{
                  marginTop: 12,
                  padding: '8px 12px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 6,
                  border: '1px solid rgba(74,122,74,0.3)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                    Transaction Hash
                  </div>
                  {txUrl ? (
                  <a
                    href={txUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.82rem',
                      color: '#6bbd6b',
                      textDecoration: 'none',
                      cursor: 'pointer',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {shortenHash(txHash)} ↗
                  </a>
                  ) : (
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.82rem',
                        color: '#6bbd6b',
                      }}
                    >
                      {shortenHash(txHash)}
                    </span>
                  )}
                </div>

                {/* Rank update */}
                {rankChanged && runnerInfo && (
                  <div className="execution__rank-up">
                    <span>{runnerInfo.rankEmoji}</span>
                    <span>→</span>
                    <span>{newRank.emoji} {newRank.rank}</span>
                  </div>
                )}

                <p style={{ fontSize: '0.8rem', color: 'var(--color-parchment-dark)', marginTop: 16 }}>
                  Completed in {elapsedSec}s
                </p>

                <button
                  className="btn btn--gold"
                  onClick={() => {
                    incrementSessionMissions();
                    setOverlay('none');
                  }}
                  style={{ marginTop: 24, padding: '12px 32px' }}
                >
                  🌿 Return to the Map
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
