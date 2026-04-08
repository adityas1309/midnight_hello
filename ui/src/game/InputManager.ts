import nipplejs, { JoystickManager } from 'nipplejs'
import { useGameStore } from './store'

export class InputManager {
  private keys: Record<string, boolean> = {}
  private joystickVector = { x: 0, y: 0 }
  private joystick: JoystickManager | null = null
  private overlayHandler: ((e: KeyboardEvent) => void) | null = null

  initialize() {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)

    // Mobile joystick
    const joystickZone = document.createElement('div')
    joystickZone.id = 'joystick-zone'
    joystickZone.style.cssText = `
      position: fixed; bottom: 80px; left: 40px;
      width: 120px; height: 120px; z-index: 100;
    `
    document.body.appendChild(joystickZone)

    this.joystick = nipplejs.create({
      zone: joystickZone,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: 'rgba(107, 189, 107, 0.6)',
    })

    this.joystick.on('move', (_, data) => {
      if (data.vector) {
        this.joystickVector = { x: data.vector.x, y: -data.vector.y }
      }
    })
    this.joystick.on('end', () => {
      this.joystickVector = { x: 0, y: 0 }
    })

    // Keyboard shortcuts for overlays
    this.overlayHandler = (e: KeyboardEvent) => {
      const state = useGameStore.getState()
      if (e.code === 'KeyE' && state.activeZoneId && state.activeOverlay === 'none') {
        if (state.activeZoneId === 'leaderboard') state.setOverlay('leaderboard')
        else if (state.activeZoneId === 'river_crossing') state.setOverlay('market')
        else state.setOverlay('mission_card')
      }
      if (e.code === 'KeyJ' && state.activeOverlay === 'none') state.setOverlay('journal')
      if (e.code === 'KeyL' && state.activeOverlay === 'none') state.setOverlay('leaderboard')
      if (e.code === 'Escape') state.setOverlay('none')
    }
    window.addEventListener('keydown', this.overlayHandler)
  }

  private onKeyDown = (e: KeyboardEvent) => { this.keys[e.code] = true }
  private onKeyUp   = (e: KeyboardEvent) => { this.keys[e.code] = false }

  getInput(): { move: number; turn: number } {
    const kb = {
      turn: (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0) - (this.keys['KeyA'] || this.keys['ArrowLeft'] ? -1 : 0),
      move: (this.keys['KeyW'] || this.keys['ArrowUp']   ? 1 : 0) - (this.keys['KeyS'] || this.keys['ArrowDown'] ? -1 : 0),
    }

    // Convert joystick to turn/move if active
    if (Math.abs(this.joystickVector.x) > 0.1 || Math.abs(this.joystickVector.y) > 0.1) {
      return {
        move: -this.joystickVector.y, // Forward/Back
        turn: this.joystickVector.x   // Left/Right
      }
    }

    // Keyboard values are -1, 0, or 1.
    // For turn: clockwise is positive, anti-clockwise is negative.
    // For move: forward is positive.
    // We adjust the signs to match THREE.js coordinate expectations in GameWorld.
    return { 
      move: (this.keys['KeyW'] || this.keys['ArrowUp'] ? 1 : 0) - (this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0),
      turn: (this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 : 0) - (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0)
    }
  }

  isSprinting(): boolean {
    return !!(this.keys['ShiftLeft'] || this.keys['ShiftRight'])
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    if (this.overlayHandler) {
      window.removeEventListener('keydown', this.overlayHandler)
    }
    this.joystick?.destroy()
    document.getElementById('joystick-zone')?.remove()
  }
}
