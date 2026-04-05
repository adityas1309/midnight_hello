import { MISSIONS, type MissionId } from '../services/contracts';
import { getActiveModifiers, calculateFinalPoints } from '../services/modifiers';
import { useGameStore } from '../game/store';

interface Props {
  missionId: MissionId;
}

export default function MissionCard({ missionId }: Props) {
  const { runnerInfo, sessionMissions, setOverlay } = useGameStore();

  const mission = MISSIONS[missionId];
  const modifiers = getActiveModifiers(mission.difficulty, sessionMissions, false);
  const { total, breakdown } = calculateFinalPoints(mission.basePoints, modifiers);

  const difficultyLeaves = Array.from({ length: 5 }, (_, i) =>
    i < mission.difficulty ? '🍃' : '·'
  ).join(' ');

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setOverlay('none')}>
      <div className="mission-card">
        <div className="mission-card__header">
          <div className="mission-card__icon">{mission.icon}</div>
          <h2 className="mission-card__title">{mission.name}</h2>
          <p className="mission-card__subtitle">
            {missionId === 'ghost_trail' && 'Silent Crossing'}
            {missionId === 'river_crossing' && 'Atomic Exchange'}
            {missionId === 'canopy_split' && 'Triple Scatter'}
            {missionId === 'stone_drop' && 'Moss Carving'}
          </p>
        </div>

        <div className="mission-card__body">
          <blockquote className="mission-card__flavour">
            {mission.flavour}
          </blockquote>

          <div className="mission-card__details">
            <div className="mission-card__detail">
              <span className="mission-card__detail-icon">🌿</span>
              <span className="mission-card__detail-label">Trail Reward</span>
              <span className="mission-card__detail-value">~{total} pts</span>
            </div>
            <div className="mission-card__detail">
              <span className="mission-card__detail-icon">⏳</span>
              <span className="mission-card__detail-label">Time Limit</span>
              <span className="mission-card__detail-value">{mission.timeLimit}</span>
            </div>
            <div className="mission-card__detail">
              <span className="mission-card__detail-icon">🍃</span>
              <span className="mission-card__detail-label">Difficulty</span>
              <span className="mission-card__detail-value">{difficultyLeaves}</span>
            </div>
          </div>

          {/* Active Modifiers */}
          {modifiers.length > 0 && (
            <div className="mission-card__modifiers">
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                ACTIVE MODIFIERS
              </p>
              {modifiers.map(mod => (
                <span key={mod.id} className="mission-card__modifier-tag">
                  {mod.icon} {mod.name} (+{Math.round((mod.multiplier - 1) * 100)}%)
                </span>
              ))}
            </div>
          )}

          {/* Score Breakdown */}
          <div style={{
            padding: '12px',
            background: 'rgba(0,0,0,0.03)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 'var(--space-md)',
          }}>
            {breakdown.map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.85rem',
                padding: '2px 0',
                color: i === 0 ? 'var(--color-text-primary)' : 'var(--color-moss)',
              }}>
                <span>{item.name}</span>
                <span style={{ fontWeight: 600 }}>
                  {i === 0 ? '' : '+'}{item.bonus}
                </span>
              </div>
            ))}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '1rem',
              fontWeight: 700,
              borderTop: '1px solid var(--color-parchment-dark)',
              marginTop: 8,
              paddingTop: 8,
              color: 'var(--color-gold-dim)',
              fontFamily: 'Cinzel, serif',
            }}>
              <span>Total</span>
              <span>~{total} pts</span>
            </div>
          </div>

          <p className="mission-card__risk">
            ⚠️ If the mission fails: trail score unchanged. Your assets return to the grove. No loss.
          </p>
        </div>

        <div className="mission-card__actions">
          <button className="btn btn--primary" onClick={() => setOverlay('mission_execution')}>
            🌿 Enter the Forest
          </button>
          <button className="btn btn--secondary" onClick={() => setOverlay('none')}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
