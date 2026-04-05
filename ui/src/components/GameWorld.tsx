import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import RunnerCharacter from './RunnerCharacter'
import RemotePlayers from './RemotePlayers'
import ZonePlanes, { treeColliders } from './ZonePlanes'
import CameraRig from './CameraRig'
import Lighting from './Lighting'
import WeatherEffects from './WeatherEffects'
import BackgroundForest from './BackgroundForest'
import { InputManager } from '../game/InputManager'
import { ZoneManager } from '../game/ZoneManager'
import { useGameStore } from '../game/store'
import { NINJA, WORLD } from '../game/constants'
import { multiplayerService } from '../services/multiplayer'

const inputManager = new InputManager()
const zoneManager = new ZoneManager()

export default function GameWorld() {
  const { scene } = useThree()
  const ninjaPos = useRef({ x: NINJA.startPos.x, z: NINJA.startPos.z })

  useEffect(() => {
    inputManager.initialize()
    zoneManager.initialize()
    return () => {
      inputManager.destroy()
      zoneManager.destroy()
    }
  }, [])

  useFrame((_, delta) => {
    // Cap delta to prevent huge jumps on tab-switch
    const dt = Math.min(delta, 0.1)

    const input = inputManager.getInput()
    const isSprinting = inputManager.isSprinting()
    const speed = isSprinting ? NINJA.runSpeed : NINJA.walkSpeed
    const turnSpeed = 3.5 // Radians per second

    // 1. Update Direction (Rotate 360 regardless of movement)
    let currentDir = useGameStore.getState().runnerDirection
    if (Math.abs(input.turn) > 0.01) {
      currentDir += input.turn * turnSpeed * dt
    }

    // 2. Move along CURRENT direction
    // Character forward vector: [sin(dir), cos(dir)]
    const dx = Math.sin(currentDir) * input.move * speed * dt
    const dz = Math.cos(currentDir) * input.move * speed * dt

    // Compute tentative new position
    let newX = ninjaPos.current.x + dx
    let newZ = ninjaPos.current.z + dz

    // No world clamping for "Endless Forest"
    // ninjaPos.current.x = Math.max(-WORLD.size / 2, Math.min(WORLD.size / 2, newX))
    // ninjaPos.current.z = Math.max(-WORLD.size / 2, Math.min(WORLD.size / 2, newZ))

    // Check tree collisions
    for (const tree of treeColliders) {
      const tdx = newX - tree.x
      const tdz = newZ - tree.z
      const dist = Math.sqrt(tdx * tdx + tdz * tdz)
      if (dist < tree.radius + 0.3) {
        // Push the player out of the tree
        const pushAngle = Math.atan2(tdz, tdx)
        const pushDist = tree.radius + 0.3 - dist + 0.01
        newX += Math.cos(pushAngle) * pushDist
        newZ += Math.sin(pushAngle) * pushDist
      }
    }

    ninjaPos.current.x = newX
    ninjaPos.current.z = newZ

    const isMoving = Math.abs(input.move) > 0.01
    const newMovementState = !isMoving ? 'idle' : isSprinting ? 'run' : 'walk'

    useGameStore.getState().setRunnerPos(
      ninjaPos.current.x,
      ninjaPos.current.z,
      currentDir,
      newMovementState as any
    )

    // Send position to multiplayer server (throttled internally to 10/s)
    const currentZone = useGameStore.getState().activeZoneId || ''
    multiplayerService.sendPosition(
      ninjaPos.current.x,
      ninjaPos.current.z,
      currentDir,
      newMovementState,
      currentZone
    )

    zoneManager.update()
  })

  return (
    <>
      <Lighting />
      <WeatherEffects />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[WORLD.groundSize, WORLD.groundSize]} />
        <meshStandardMaterial color={0x4a7a4a} roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Zone 3D environments */}
      <BackgroundForest />
      <ZonePlanes />

      {/* Player character */}
      <RunnerCharacter ninjaPos={ninjaPos} />

      {/* Other connected players */}
      <RemotePlayers />

      {/* Camera follows player */}
      <CameraRig ninjaPos={ninjaPos} />
    </>
  )
}
