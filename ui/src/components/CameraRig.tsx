import { useFrame, useThree } from '@react-three/fiber'
import { MutableRefObject } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import { WORLD } from '../game/constants'

interface Props {
  ninjaPos: MutableRefObject<{ x: number; z: number }>
}

const targetPos = new THREE.Vector3()
const lookAtTarget = new THREE.Vector3()
const currentLookAt = new THREE.Vector3()
let smoothedDirection = 0

// Vice City style camera constants
const CAMERA_IDLE_DIST = 6.5    // fallback/idle distance
const POS_LERP = 0.1           // position smoothing
const LOOK_LERP = 0.12         // look-at smoothing
const ROT_LERP = 4.0           // rotation smoothing speed
const MIN_CAMERA_Y = 1.5       // never go below this height

export default function CameraRig({ ninjaPos }: Props) {
  const { camera } = useThree()
  const halfWorld = WORLD.size / 2

  useFrame((_, delta) => {
    // Read current character state from store
    const { runnerDirection: direction, movementState } = useGameStore.getState()

    // Calculate dynamic distance: Zoom in when moving
    let targetDist = CAMERA_IDLE_DIST
    if (movementState === 'run') targetDist = 4.5
    else if (movementState === 'walk') targetDist = 5.4

    // Smoothly interpolate the camera's orbital angle
    let diff = direction - smoothedDirection
    while (diff < -Math.PI) diff += Math.PI * 2
    while (diff > Math.PI) diff -= Math.PI * 2
    smoothedDirection += diff * delta * ROT_LERP

    // Calculate the vector pointing behind the character
    // The character faces `smoothedDirection`, so its back is at `smoothedDirection + PI`
    const behindAngle = smoothedDirection + Math.PI
    const offsetX = Math.sin(behindAngle) * targetDist
    const offsetZ = Math.cos(behindAngle) * targetDist

    // Target camera position: behind and above the character
    targetPos.set(
      ninjaPos.current.x + offsetX,
      3.5, // Cinematic height
      ninjaPos.current.z + offsetZ
    )

    // Clamp camera inside world bounds
    targetPos.x = Math.max(-halfWorld, Math.min(halfWorld, targetPos.x))
    targetPos.z = Math.max(-halfWorld, Math.min(halfWorld, targetPos.z))
    targetPos.y = Math.max(MIN_CAMERA_Y, targetPos.y)

    // Smoothly lerp camera position
    camera.position.lerp(targetPos, POS_LERP)

    // Look-at target: slightly above the character's head
    lookAtTarget.set(
      ninjaPos.current.x,
      1.8, // Look at character's upper body
      ninjaPos.current.z
    )

    // Smoothly lerp the look-at point
    currentLookAt.lerp(lookAtTarget, LOOK_LERP)
    camera.lookAt(currentLookAt)
  })

  return null
}
