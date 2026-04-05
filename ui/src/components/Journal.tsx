import { useEffect, useState } from 'react';
import { useGameStore } from '../game/store';
import { disconnectWallet, fetchRunnerState, fetchStoneDropState } from '../services/gameState';
import type { RunnerState, StoneDropState } from '../services/gameState';
import type { TxRecord } from '../game/store';
import { getTransactionUrl } from '../services/contracts';

function shortenHash(hash: string): string {
  if (hash.length <= 19) {
    return hash;
  }

  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

function relativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getMissionIcon(missionType: string): string {
  const icons: Record<string, string> = {
    ghost_trail: '👻',
    river_crossing: '🌊',
    canopy_split: '🌳',
    stone_drop: '🪨',
    river_crossing_swap: '🤝',
  };

  return icons[missionType] || '🌿';
}

export default function Journal() {
  const { setOverlay, txHistory } = useGameStore();
  const [runner, setRunner] = useState<RunnerState | null>(null);
  const [stoneDrop, setStoneDrop] = useState<StoneDropState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [runnerState, stoneDropState] = await Promise.all([
          fetchRunnerState(),
          fetchStoneDropState(),
        ]);
        setRunner(runnerState);
        setStoneDrop(stoneDropState);
      } catch (error) {
        console.error('Failed to load journal data:', error);
      }
      setLoading(false);
    }

    void loadData();
  }, []);

  if (loading || !runner || !stoneDrop) {
    return (
      <div className="modal-overlay" style={{ pointerEvents: 'auto' }}>
        <div className="journal" style={{ margin: 'auto', textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--color-gold)' }}>Opening Journal...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="modal-overlay"
      style={{ pointerEvents: 'auto' }}
      onClick={(event) => event.target === event.currentTarget && setOverlay('none')}
    >
      <div
        className="journal"
        style={{ margin: 'auto', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}
      >
        <button
          className="btn"
          onClick={() => setOverlay('none')}
          style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}
        >
          Close (ESC)
        </button>

        <div className="journal__cover">
          <h1 className="journal__runner-name">{runner.runnerName || 'Unknown Runner'}</h1>
          <div className="journal__rank-badge">
            {runner.rankEmoji} {runner.currentRank}
          </div>
          <p style={{ marginTop: 12, fontSize: '0.85rem', opacity: 0.7 }}>
            Trail Score: {runner.trailScore.toLocaleString()} • Weekly:{' '}
            {runner.weeklyScore.toLocaleString()}
          </p>
        </div>

        <div className="journal__pages">
          <div className="journal__page" style={{ flex: '1 1 100%' }}>
            <h3 className="journal__page-title">📊 Runner Statistics</h3>
            <div className="journal__stat-grid">
              <div className="journal__stat">
                <div className="journal__stat-value">{runner.trailScore.toLocaleString()}</div>
                <div className="journal__stat-label">All-Time Score</div>
              </div>
              <div className="journal__stat">
                <div className="journal__stat-value">{runner.weeklyScore.toLocaleString()}</div>
                <div className="journal__stat-label">Weekly Score</div>
              </div>
              <div className="journal__stat">
                <div className="journal__stat-value">{runner.totalMissions}</div>
                <div className="journal__stat-label">Missions</div>
              </div>
              <div className="journal__stat">
                <div className="journal__stat-value">{runner.isRegistered ? '✅' : '❌'}</div>
                <div className="journal__stat-label">Registered</div>
              </div>
            </div>
          </div>

          <div className="journal__page" style={{ flex: '1 1 100%' }}>
            <h3 className="journal__page-title">🪨 Stone Drop Map</h3>
            <div className="journal__stat-grid">
              <div className="journal__stat">
                <div className="journal__stat-value">{stoneDrop.totalDrops}</div>
                <div className="journal__stat-label">Total Drops</div>
              </div>
              <div className="journal__stat">
                <div className="journal__stat-value">{stoneDrop.totalClaims}</div>
                <div className="journal__stat-label">Claims</div>
              </div>
              <div className="journal__stat">
                <div className="journal__stat-value">{stoneDrop.revokedDrops}</div>
                <div className="journal__stat-label">Revoked</div>
              </div>
              <div className="journal__stat">
                <div className="journal__stat-value">
                  {stoneDrop.totalDrops - stoneDrop.totalClaims - stoneDrop.revokedDrops}
                </div>
                <div className="journal__stat-label">Pending</div>
              </div>
            </div>
          </div>

          <div className="journal__page" style={{ flex: '1 1 100%' }}>
            <h3 className="journal__page-title">🔗 Transaction Trail</h3>
            {txHistory.length === 0 ? (
              <p
                style={{
                  color: 'var(--color-text-muted)',
                  fontStyle: 'italic',
                  padding: '16px 0',
                  fontSize: '0.85rem',
                }}
              >
                No trails recorded yet. Complete a mission to seal your first transaction.
              </p>
            ) : (
              <div className="trail-log">
                {txHistory.map((tx: TxRecord) => {
                  const txUrl = getTransactionUrl(tx.txHash);

                  return (
                    <div key={tx.txHash} className="trail-log__entry">
                      <span className="trail-log__entry-icon">{getMissionIcon(tx.missionType)}</span>
                      <div className="trail-log__entry-info">
                        <div className="trail-log__entry-type" style={{ fontSize: '0.82rem' }}>
                          {tx.description}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginTop: 2,
                          }}
                        >
                          {txUrl ? (
                            <a
                              href={txUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontFamily: 'monospace',
                                fontSize: '0.72rem',
                                color: '#6bbd6b',
                                textDecoration: 'none',
                                pointerEvents: 'auto',
                              }}
                            >
                              {shortenHash(tx.txHash)}
                            </a>
                          ) : (
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontSize: '0.72rem',
                                color: '#6bbd6b',
                              }}
                            >
                              {shortenHash(tx.txHash)}
                            </span>
                          )}
                          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                            {relativeTime(tx.timestamp)}
                          </span>
                          <span
                            style={{
                              fontSize: '0.62rem',
                              padding: '1px 6px',
                              borderRadius: 10,
                              fontWeight: 600,
                              ...(tx.status === 'pending'
                                ? {
                                    background: 'rgba(212,167,69,0.2)',
                                    color: '#d4a745',
                                    border: '1px solid rgba(212,167,69,0.3)',
                                  }
                                : tx.status === 'confirmed'
                                  ? {
                                      background: 'rgba(107,189,107,0.2)',
                                      color: '#6bbd6b',
                                      border: '1px solid rgba(107,189,107,0.3)',
                                    }
                                  : {
                                      background: 'rgba(200,60,60,0.2)',
                                      color: '#c83c3c',
                                      border: '1px solid rgba(200,60,60,0.3)',
                                    }),
                            }}
                          >
                            {tx.status}
                          </span>
                        </div>
                      </div>
                      {tx.points > 0 && (
                        <span className="trail-log__entry-score">+{tx.points}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            padding: '12px 24px 20px',
            textAlign: 'center',
            borderTop: '1px solid rgba(74,122,74,0.15)',
          }}
        >
          <button
            className="btn btn--secondary"
            onClick={disconnectWallet}
            style={{
              fontSize: '0.72rem',
              padding: '5px 14px',
              opacity: 0.6,
              pointerEvents: 'auto',
            }}
          >
            Disconnect Wallet
          </button>
        </div>
      </div>
    </div>
  );
}
