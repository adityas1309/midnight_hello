import { useGameStore } from './store'
import { ZONES } from './constants'

export class ZoneManager {
  initialize() {}
  destroy() {}

  update() {
    const state = useGameStore.getState()
    const pos = state.runnerWorldPos

    let closest: string | null = null
    let minDist = Infinity

    for (const zone of ZONES) {
      const dx = pos.x - zone.x
      const dz = pos.y - zone.z  // store.y maps to Three.js Z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < zone.triggerRadius && dist < minDist) {
        closest = zone.id
        minDist = dist
      }
    }

    if (state.activeZoneId !== closest) {
      state.setActiveZone(closest)
    }
  }
}
