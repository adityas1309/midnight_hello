import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import type { RemotePlayer, MovementState } from '../game/store'
import { NINJA } from '../game/constants'

const UAL1_PATH = '/assets/UAL1_Standard.glb'
const UAL2_PATH = '/assets/UAL2_Standard.glb'

// Same animation map as RunnerCharacter
const ANIM_MAP: Record<MovementState, string[]> = {
  idle: ['Idle_No_Loop', 'Idle_FoldArms_Loop', 'Idle_Loop'],
  walk: ['walk', 'Walk_Carry_Loop', 'Walk_Loop', 'Walk_Formal_Loop'],
  run: ['sprint', 'Slide_Loop', 'Sprint_Loop', 'Jog_Fwd_Loop'],
  sneak: ['NinjaJump_Idle_Loop', 'Crouch_Idle_Loop', 'Crouch_Fwd_Loop'],
  victory: ['Yes', 'Dance_Loop', 'Sword_Regular_Combo'],
}

// Blue tint material for remote players
const REMOTE_MATERIAL = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0.35, 0.45, 0.65),
  roughness: 0.7,
  metalness: 0.3,
})

function RemotePlayerMesh({ player }: { player: RemotePlayer }) {
  const group = useRef<THREE.Group>(null)
  const prevActionRef = useRef<THREE.AnimationAction | null>(null)
  const targetPosRef = useRef({ x: player.x, z: player.z })
  const targetDirRef = useRef(player.direction)

  // Load UAL2 scene - clone for each remote player
  const ual2 = useGLTF(UAL2_PATH)
  const ual1 = useGLTF(UAL1_PATH)

  const clonedScene = useMemo(() => {
    const clone = ual2.scene.clone(true)
    clone.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.material = REMOTE_MATERIAL
        mesh.castShadow = true
        mesh.receiveShadow = false
      }
    })
    return clone
  }, [ual2.scene])

  const animations = useMemo(() => {
    const clipMap = new Map<string, THREE.AnimationClip>()
    ual1.animations.forEach(clip => clipMap.set(clip.name, clip))
    ual2.animations.forEach(clip => clipMap.set(clip.name, clip))
    return Array.from(clipMap.values())
  }, [ual1.animations, ual2.animations])
  const { actions } = useAnimations(animations, group)

  // Update target refs when player data changes
  useEffect(() => {
    targetPosRef.current = { x: player.x, z: player.z }
    targetDirRef.current = player.direction
  }, [player.x, player.z, player.direction])

  // Find best action for a movement state
  const findAction = (state: string): THREE.AnimationAction | null => {
    const candidates = ANIM_MAP[state as MovementState]
    if (!candidates) return null
    for (const name of candidates) {
      if (actions[name]) return actions[name]!
    }
    return null
  }

  // Start idle on mount
  useEffect(() => {
    const idleAction = findAction('idle')
    if (idleAction) {
      idleAction.reset().fadeIn(0.2).play()
      prevActionRef.current = idleAction
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions])

  // Switch animation when movementState changes
  useEffect(() => {
    if (!actions || Object.keys(actions).length === 0) return

    const newAction = findAction(player.movementState)
    if (!newAction) return
    if (prevActionRef.current === newAction) return

    if (prevActionRef.current) {
      prevActionRef.current.fadeOut(0.2)
    }

    const isVictory = player.movementState === 'victory'
    if (isVictory) {
      newAction.setLoop(THREE.LoopOnce, 1)
      newAction.clampWhenFinished = true
    } else {
      newAction.setLoop(THREE.LoopRepeat, Infinity)
      newAction.clampWhenFinished = false
    }

    newAction.reset().fadeIn(0.2).play()
    prevActionRef.current = newAction
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.movementState, actions])

  // Lerp position and rotation each frame
  useFrame(() => {
    if (!group.current) return

    // Lerp position
    group.current.position.x += (targetPosRef.current.x - group.current.position.x) * 0.15
    group.current.position.z += (targetPosRef.current.z - group.current.position.z) * 0.15
    group.current.position.y = 0

    // Lerp rotation using shortest angle path
    const targetY = targetDirRef.current + Math.PI
    let diff = targetY - group.current.rotation.y
    while (diff < -Math.PI) diff += Math.PI * 2
    while (diff > Math.PI) diff -= Math.PI * 2
    group.current.rotation.y += diff * 0.15
  })

  return (
    <group ref={group} scale={NINJA.scale} dispose={null}>
      <primitive object={clonedScene} />
      {/* Floating name tag */}
      <Html
        position={[0, 2.5 / NINJA.scale, 0]}
        center
        distanceFactor={80}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div style={{
          fontFamily: 'Cinzel, serif',
          fontSize: '14px',
          color: '#6bbd6b',
          background: 'rgba(10, 20, 10, 0.75)',
          padding: '2px 8px',
          borderRadius: '4px',
          border: '1px solid rgba(107, 189, 107, 0.3)',
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}>
          {player.runnerName}
        </div>
      </Html>
    </group>
  )
}

export default function RemotePlayers() {
  const remotePlayers = useGameStore((s) => s.remotePlayers)

  const playerArray = useMemo(() => {
    return Array.from(remotePlayers.values())
  }, [remotePlayers])

  return (
    <>
      {playerArray.map(player => (
        <RemotePlayerMesh key={player.socketId} player={player} />
      ))}
    </>
  )
}

// Preload assets
useGLTF.preload(UAL1_PATH)
useGLTF.preload(UAL2_PATH)
