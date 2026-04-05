import { useEffect, useState } from 'react'
import { useGameStore } from '../game/store'
import { ZONES } from '../game/constants'
import type { NarrativeEvent } from '../game/store'

export default function HUD() {
  const { runnerInfo, activeZoneId, runnerWorldPos, chainAlertActive, narrativeEvents, remotePlayers } = useGameStore()

  const nearbyZone = ZONES.find(z => z.id === activeZoneId)
  const runnerCount = remotePlayers.size + 1

  // Zone lore text
  const ZONE_LORE: Record<string, { name: string; lore: string }> = {
    ghost_trail: { name: 'Whispering Grove', lore: 'Move without leaving a trace' },
    river_crossing: { name: 'River Crossing', lore: 'Two runners, one atomic exchange, zero records' },
    canopy_split: { name: 'Canopy Scatter', lore: 'Divide before CHAIN\'s drone reaches you' },
    stone_drop: { name: 'Ancient Stone', lore: 'Leave a secret only one person can claim' },
    leaderboard: { name: 'The Monument', lore: 'The only public record in the forest' },
  }

  // CHAIN alert narrative overlay — shows for 4s then collapses to banner
  const [chainOverlayVisible, setChainOverlayVisible] = useState(false)
  const [chainOverlayOpacity, setChainOverlayOpacity] = useState(0)

  useEffect(() => {
    if (chainAlertActive) {
      setChainOverlayVisible(true)
      setChainOverlayOpacity(1)
      // Fade out after 3 seconds
      const fadeTimer = setTimeout(() => setChainOverlayOpacity(0), 3000)
      // Remove overlay entirely after 4 seconds
      const removeTimer = setTimeout(() => setChainOverlayVisible(false), 4000)
      return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer) }
    } else {
      setChainOverlayVisible(false)
    }
  }, [chainAlertActive])

  // Track visible narrative events with fade
  const [visibleEvents, setVisibleEvents] = useState<NarrativeEvent[]>([])

  useEffect(() => {
    setVisibleEvents(narrativeEvents.slice(0, 3))
  }, [narrativeEvents])

  return (
    <>
      {/* CHAIN Alert Banner — full width at top */}
      {chainAlertActive && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          background: 'linear-gradient(90deg, rgba(180,40,20,0.9), rgba(200,60,30,0.85), rgba(180,40,20,0.9))',
          padding: '10px 20px',
          textAlign: 'center',
          fontFamily: 'Cinzel, serif',
          fontSize: '0.85rem',
          fontWeight: 700,
          color: '#ffe0c0',
          letterSpacing: '1px',
          zIndex: 50,
          animation: 'chainAlertPulse 1s ease-in-out infinite',
          pointerEvents: 'none',
        }}>
          ⚠️ CHAIN ALERT ACTIVE — Drones scanning all sectors — Score ×1.4 for 30 minutes
        </div>
      )}

      {/* Top-left: runner info */}
      <div style={{
        position: 'absolute', top: chainAlertActive ? 60 : 20, left: 20,
        background: 'rgba(10,20,10,0.8)',
        border: '1px solid #4a7a4a',
        borderRadius: 8, padding: '10px 16px',
        color: '#f5e6c8', fontFamily: 'Cinzel, serif',
        pointerEvents: 'none',
      }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>
          {runnerInfo?.runnerName || '???'}
        </div>
        <div style={{ fontSize: 12, color: '#6bbd6b', marginTop: 2 }}>
          {runnerInfo?.rankEmoji} {runnerInfo?.currentRank || 'Seedling'}
        </div>
      </div>

      {/* Top center: runner count */}
      <div style={{
        position: 'absolute', top: chainAlertActive ? 60 : 20,
        left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(245,230,200,0.35)',
        fontSize: '0.75rem',
        fontFamily: 'Inter, sans-serif',
        pointerEvents: 'none',
      }}>
        {runnerCount} runner{runnerCount !== 1 ? 's' : ''} in the forest
      </div>

      {/* Top-right: trail score */}
      <div style={{
        position: 'absolute', top: chainAlertActive ? 60 : 20, right: 20,
        background: 'rgba(10,20,10,0.8)',
        border: '1px solid #d4a745',
        borderRadius: 8, padding: '10px 16px',
        color: '#d4a745', fontFamily: 'Cinzel, serif',
        textAlign: 'right', pointerEvents: 'none',
      }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>
          {(runnerInfo?.trailScore ?? 0).toLocaleString()}
        </div>
        <div style={{ fontSize: 11, color: '#a07830' }}>TRAIL SCORE</div>
      </div>

      {/* CHAIN Alert Narrative Overlay — center screen for 4 seconds */}
      {chainOverlayVisible && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 60,
          pointerEvents: 'none',
          opacity: chainOverlayOpacity,
          transition: 'opacity 1s ease-out',
        }}>
          <p style={{
            fontFamily: 'Crimson Text, serif',
            fontStyle: 'italic',
            fontSize: '2rem',
            color: '#ffe0c0',
            textShadow: '0 0 40px rgba(200,60,30,0.8), 0 0 80px rgba(180,40,20,0.4)',
            textAlign: 'center',
            maxWidth: 600,
          }}>
            CHAIN sweep initiated. All sectors scanning.
          </p>
        </div>
      )}

      {/* Center: zone prompt */}
      {nearbyZone && (
        <div style={{
          position: 'absolute',
          bottom: 120,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(10,20,10,0.9)',
          border: '1px solid #6bbd6b',
          borderRadius: 8, padding: '12px 24px',
          color: '#f5e6c8', fontFamily: 'Cinzel, serif',
          fontSize: 16, textAlign: 'center',
          pointerEvents: 'none',
          animation: 'pulse 1.5s ease-in-out infinite',
          maxWidth: 440,
        }}>
          <span style={{ color: '#d4a745', fontWeight: 700 }}>
            {ZONE_LORE[nearbyZone.id]?.name || nearbyZone.id}
          </span>
          {' — Press '}
          <strong style={{ color: '#6bbd6b' }}>E</strong>
          {' — '}
          <span style={{
            fontFamily: 'Crimson Text, serif',
            fontStyle: 'italic',
            fontSize: 14,
            color: 'rgba(160, 184, 144, 0.85)',
          }}>
            {ZONE_LORE[nearbyZone.id]?.lore || 'Enter this zone'}
          </span>
        </div>
      )}

      {/* Narrative Events — floating above zone prompt */}
      {visibleEvents.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: nearbyZone ? 170 : 100,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          pointerEvents: 'none',
          maxWidth: '80vw',
        }}>
          {visibleEvents.map(event => (
            <NarrativeEventLine key={event.id} event={event} />
          ))}
        </div>
      )}

      {/* Bottom-left: WASD hints */}
      <div style={{
        position: 'absolute', bottom: 20, left: 20,
        color: 'rgba(245,230,200,0.4)',
        fontSize: 12, fontFamily: 'Inter, sans-serif',
        pointerEvents: 'none',
      }}>
        WASD / Arrow Keys to move · Shift to sprint
        <br />J = Journal · L = Leaderboard · E = Enter Zone
      </div>

      {/* Bottom-right: minimap */}
      <Minimap />
    </>
  )
}

function NarrativeEventLine({ event }: { event: NarrativeEvent }) {
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    const elapsed = Date.now() - event.timestamp
    const remaining = Math.max(0, 8000 - elapsed)

    // Start fading near the end
    const fadeTimer = setTimeout(() => {
      setOpacity(0)
    }, Math.max(0, remaining - 1500))

    return () => clearTimeout(fadeTimer)
  }, [event.timestamp])

  const isHighUrgency = event.urgency === 'high'

  return (
    <div style={{
      fontFamily: 'Crimson Text, serif',
      fontStyle: 'italic',
      fontSize: '0.85rem',
      color: isHighUrgency ? '#e8a040' : 'rgba(160, 184, 144, 0.8)',
      textAlign: 'center',
      opacity,
      transition: 'opacity 1.5s ease-out',
    }}>
      {event.message}
    </div>
  )
}

function Minimap() {
  const { runnerWorldPos, remotePlayers } = useGameStore()
  const MAP_SIZE = 160
  const ZOOM = 1.0 // Scale of the map visibility (higher = zoomed out)
  const RANGE = 50 * ZOOM // Area visible in the map (e.g. 50m radius)

  // Ninja is always at center [75, 75] relative to map container
  const CX = MAP_SIZE / 2
  const CY = MAP_SIZE / 2

  return (
    <div style={{
      position: 'absolute', bottom: 20, right: 20,
      width: MAP_SIZE, height: MAP_SIZE,
      background: 'rgba(10,20,10,0.85)',
      border: '2px solid rgba(74,122,74,0.4)',
      borderRadius: 8,
      overflow: 'hidden',
      pointerEvents: 'none',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    }}>
      {/* Container that moves inversely to player position */}
      <div style={{
        position: 'absolute',
        width: '100%', height: '100%',
        left: 0, top: 0,
      }}>
        {/* Zone dots */}
        {ZONES.map(zone => {
          const dx = (zone.x - runnerWorldPos.x) * (MAP_SIZE / (RANGE * 2))
          const dy = (zone.z - runnerWorldPos.y) * (MAP_SIZE / (RANGE * 2))
          const isVisible = Math.abs(dx) < MAP_SIZE / 2 && Math.abs(dy) < MAP_SIZE / 2
          if (!isVisible) return null

          return (
            <div key={zone.id} style={{
              position: 'absolute',
              left: CX + dx - 4, top: CY + dy - 4,
              width: 8, height: 8,
              borderRadius: '50%',
              background: '#4a7a4a',
              border: '1px solid #6bbd6b',
            }} />
          )
        })}

        {/* Remote player dots */}
        {Array.from(remotePlayers.values()).map(rp => {
          const rpx = (rp.x - runnerWorldPos.x) * (MAP_SIZE / (RANGE * 2))
          const rpy = (rp.z - runnerWorldPos.y) * (MAP_SIZE / (RANGE * 2))
          const isVisible = Math.abs(rpx) < MAP_SIZE / 2 && Math.abs(rpy) < MAP_SIZE / 2
          if (!isVisible) return null

          return (
            <div key={rp.socketId} style={{
              position: 'absolute',
              left: CX + rpx - 3, top: CY + rpy - 3,
              width: 6, height: 6,
              borderRadius: '50%',
              background: '#5588aa',
              boxShadow: '0 0 4px #5588aa',
            }} />
          )
        })}

        {/* Local runner (Center dot) */}
        <div style={{
          position: 'absolute',
          left: CX - 5, top: CY - 5,
          width: 10, height: 10,
          borderRadius: '50%',
          background: '#6bbd6b',
          boxShadow: '0 0 6px #6bbd6b',
          zIndex: 5,
        }} />
      </div>
    </div>
  )
}
