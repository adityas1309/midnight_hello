import { useState } from 'react';
import { getSeasonDaysRemaining } from '../services/gameState';
import { useGameStore } from '../game/store';

export default function Leaderboard() {
  const [tab, setTab] = useState<'weekly' | 'alltime'>('weekly');
  const seasonDays = getSeasonDaysRemaining();
  
  const { setOverlay, runnerInfo: runner } = useGameStore();

  // The actual implementation relies on the Midnight Indexer.
  // We only show real on-chain data. Currently, we only fetch the connected user's state.
  const entries = [];
  
  if (runner?.isRegistered && runner.runnerName) {
    entries.push({
      position: 1,
      name: runner.runnerName,
      score: tab === 'weekly' ? runner.weeklyScore : runner.trailScore,
      rank: runner.rankEmoji,
      verified: true,
    });
  }

  const maxScore = entries[0]?.score || 1;

  return (
    <div className="modal-overlay" style={{ pointerEvents: 'auto' }} onClick={(e) => e.target === e.currentTarget && setOverlay('none')}>
      <div className="leaderboard" style={{ margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
        <button className="btn" onClick={() => setOverlay('none')} style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
          Close (ESC)
        </button>
        
        <div className="leaderboard__monument">
          <h1 className="leaderboard__title">⚔️ Ancient Map Monument</h1>
          <p className="leaderboard__subtitle">
            "Only those who leave no trace earn a place on the stone."
          </p>

          {/* Season Timer */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            background: 'rgba(212, 167, 69, 0.15)',
            border: '1px solid rgba(212, 167, 69, 0.3)',
            borderRadius: 6,
            fontSize: '0.85rem',
            color: 'var(--color-gold)',
            marginBottom: 24,
          }}>
            🔥 Season ends in {seasonDays} days
          </div>

          {/* Tabs */}
          <div className="leaderboard__tabs">
            <button
              className={`leaderboard__tab ${tab === 'weekly' ? 'leaderboard__tab--active' : ''}`}
              onClick={() => setTab('weekly')}
            >
              This Week
            </button>
            <button
              className={`leaderboard__tab ${tab === 'alltime' ? 'leaderboard__tab--active' : ''}`}
              onClick={() => setTab('alltime')}
            >
              All-Time Legends
            </button>
          </div>
        </div>

        {/* Leaderboard Entries - Strictly real data */}
        <div className="leaderboard__list">
          {entries.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-moss-light)', fontStyle: 'italic' }}>
              <p>The monument stones are bare.</p>
              <p style={{ fontSize: '0.9rem', marginTop: 8 }}>No registered runners have emerged from the mist this season.</p>
            </div>
          ) : (
            entries.map(entry => (
              <div
                key={entry.position}
                className={`leaderboard__entry ${entry.position <= 3 ? 'leaderboard__entry--top3' : ''}`}
                style={entry.name === runner?.runnerName ? {
                  background: 'rgba(107, 189, 107, 0.1)',
                  border: '1px solid rgba(107, 189, 107, 0.3)',
                  borderRadius: 8,
                } : undefined}
              >
                <span className="leaderboard__position">
                  {entry.position <= 3 ? ['🥇', '🥈', '🥉'][entry.position - 1] : `#${entry.position}`}
                </span>

                <span className="leaderboard__runner-name">
                  {entry.rank} {entry.name}
                  {entry.name === runner?.runnerName && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-moss-light)', marginLeft: 8 }}>
                      (You)
                    </span>
                  )}
                </span>

                {/* ZK Proof Badge */}
                {entry.verified && (
                  <span className="leaderboard__zk-badge" title="This score is ZK-verified on Midnight Network">
                    🍃
                  </span>
                )}

                <span className="leaderboard__score">
                  {entry.score.toLocaleString()}
                </span>

                <div className="leaderboard__score-bar">
                  <div
                    className="leaderboard__score-bar-fill"
                    style={{ width: `${(entry.score / maxScore) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Hall of Legends */}
        <div style={{
          padding: '24px',
          textAlign: 'center',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          <h3 style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '1rem',
            color: 'var(--color-stone-light)',
            marginBottom: 8,
          }}>
            🏛️ Hall of Legends
          </h3>
          <p style={{
            fontFamily: 'Crimson Text, serif',
            fontStyle: 'italic',
            fontSize: '0.85rem',
            color: 'var(--color-parchment-dark)',
          }}>
            Ancient stone tablets lie half-buried in moss — the all-time greats are preserved permanently on Midnight's public ledger.
          </p>
        </div>
      </div>
    </div>
  );
}
