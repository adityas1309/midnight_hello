import { useRef, useEffect, useMemo, MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import { NINJA } from '../game/constants'
import type { MovementState } from '../game/store'
import { SkeletonUtils } from 'three-stdlib'

// ── Asset Paths ──

const UAL2_PATH = '/assets/UAL2_Standard.glb'
const UAL1_PATH = '/assets/UAL1_Standard.glb'

const MODULAR_BASE = '/assets/modular/Modular Parts/'
const RANGER_BODY = MODULAR_BASE + 'Male_Ranger_Body.gltf'
const RANGER_ARMS = MODULAR_BASE + 'Male_Ranger_Arms.gltf'
const RANGER_LEGS = MODULAR_BASE + 'Male_Ranger_Legs.gltf'
const RANGER_FEET = MODULAR_BASE + 'Male_Ranger_Feet_Boots.gltf'
const RANGER_HOOD = MODULAR_BASE + 'Male_Ranger_Head_Hood.gltf'

const RANGER_BASECOLOR = MODULAR_BASE + 'T_Ranger_BaseColor.png'
const RANGER_NORMAL = MODULAR_BASE + 'T_Ranger_Normal.png'
const RANGER_ORM = MODULAR_BASE + 'T_Ranger_ORM.png'

// ── Animation Map ──
// Priority list: try each name in order, use the first found

const ANIM_MAP: Record<MovementState, string[]> = {
  idle: ['Idle_No_Loop', 'Idle_FoldArms_Loop', 'Idle_Loop'],
  walk: ['walk', 'Walk_Loop', 'Walk_Formal_Loop'],
  run: ['sprint', 'Sprint_Loop', 'Jog_Fwd_Loop'],
  sneak: ['NinjaJump_Idle_Loop', 'Crouch_Idle_Loop', 'Crouch_Fwd_Loop'],
  victory: ['Yes', 'Dance_Loop', 'Sword_Regular_Combo'],
}

interface Props {
  ninjaPos: MutableRefObject<{ x: number; z: number }>
}

export default function RunnerCharacter({ ninjaPos }: Props) {
  const group = useRef<THREE.Group>(null)
  const movementState = useGameStore((s) => s.movementState)
  const runnerDirection = useGameStore((s) => s.runnerDirection)
  const prevActionRef = useRef<THREE.AnimationAction | null>(null)

  // Load UAL2 as primary scene + skeleton
  const ual2 = useGLTF(UAL2_PATH)
  // Load UAL1 for additional animation clips only
  const ual1 = useGLTF(UAL1_PATH)

  // Load Ranger outfit parts
  const rangerBody = useGLTF(RANGER_BODY)
  const rangerArms = useGLTF(RANGER_ARMS)
  const rangerLegs = useGLTF(RANGER_LEGS)
  const rangerFeet = useGLTF(RANGER_FEET)
  const rangerHood = useGLTF(RANGER_HOOD)

  // Load Ranger textures
  const rangerTextures = useMemo(() => {
    const loader = new THREE.TextureLoader()
    const baseColor = loader.load(RANGER_BASECOLOR)
    const normal = loader.load(RANGER_NORMAL)
    const orm = loader.load(RANGER_ORM)

      // Fix texture settings
      ;[baseColor, normal, orm].forEach(t => {
        t.flipY = false
        t.colorSpace = THREE.SRGBColorSpace
      })
    normal.colorSpace = THREE.LinearSRGBColorSpace
    orm.colorSpace = THREE.LinearSRGBColorSpace

    return { baseColor, normal, orm }
  }, [])

  // Create Ranger material from textures
  const rangerMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: rangerTextures.baseColor,
      normalMap: rangerTextures.normal,
      aoMap: rangerTextures.orm,
      roughnessMap: rangerTextures.orm,
      metalnessMap: rangerTextures.orm,
      roughness: 1,
      metalness: 0,
    })
  }, [rangerTextures])

  // Apply Ranger material and BIND to the main skeleton
  const characterGroup = useMemo(() => {
    // 1. Clone the base body scene using SkeletonUtils
    const mainScene = SkeletonUtils.clone(ual2.scene)

    // Find the main skeleton
    let mainSkeleton: THREE.Skeleton | null = null
    mainScene.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        mainSkeleton = (child as THREE.SkinnedMesh).skeleton
      }
    })

    if (!mainSkeleton) {
      console.warn('[RunnerCharacter] No skeleton found in UAL2 base scene')
    }

    // 2. Process the base scene meshes
    mainScene.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = true

        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        materials.forEach(mat => {
          if (mat) {
            mat.transparent = false
            mat.opacity = 1
            mat.side = THREE.DoubleSide
          }
        })
      }
    })

    // 3. Process outfit parts and bind them to the main skeleton
    const parts = [rangerBody, rangerArms, rangerLegs, rangerFeet, rangerHood]
    parts.forEach(part => {
      const partClone = SkeletonUtils.clone(part.scene)
      partClone.traverse((child: THREE.Object3D) => {
        if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
          const mesh = child as THREE.SkinnedMesh
          mesh.material = rangerMaterial
          mesh.castShadow = true
          mesh.receiveShadow = true

          if (mainSkeleton) {
            mesh.bind(mainSkeleton, mesh.bindMatrix)
          }
        }
      })

        // Merge hierarchies: add everything from the part clone to the main scene
        // We need to add the children of the partClone directly to the mainScene
        // to avoid nested groups and ensure all skinned meshes are under the same skeleton root.
        // Use [...children] to avoid mutation issues during iteration.
        ;[...partClone.children].forEach(child => {
          mainScene.add(child)
        })
    })

    return mainScene
  }, [ual2, rangerBody, rangerArms, rangerLegs, rangerFeet, rangerHood, rangerMaterial])

  // Merge animation clips from both UAL files — UAL2 clips take priority
  const allAnimations = useMemo(() => {
    const clipMap = new Map<string, THREE.AnimationClip>()

    // Add UAL1 clips first
    ual1.animations.forEach(clip => {
      clipMap.set(clip.name, clip)
    })

    // UAL2 clips overwrite UAL1 clips with same name
    ual2.animations.forEach(clip => {
      clipMap.set(clip.name, clip)
    })

    return Array.from(clipMap.values())
  }, [ual1.animations, ual2.animations])

  const { actions } = useAnimations(allAnimations, group)

  // Find the best matching action for a movement state
  const findAction = (state: MovementState): THREE.AnimationAction | null => {
    const candidates = ANIM_MAP[state]
    if (!candidates) return null

    for (const name of candidates) {
      if (actions[name]) {
        return actions[name]!
      }
    }

    // Fallback: log warning for debugging
    console.warn(
      `[RunnerCharacter] No animation found for state "${state}". Tried: ${candidates.join(', ')}. Available: ${Object.keys(actions).join(', ')}`
    )
    return null
  }

  // Start idle animation on mount
  useEffect(() => {
    const idleAction = findAction('idle')
    if (idleAction) {
      idleAction.reset().fadeIn(0.2).play()
      prevActionRef.current = idleAction
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions])

  // Switch animations when movementState changes
  useEffect(() => {
    if (!actions || Object.keys(actions).length === 0) return

    const newAction = findAction(movementState)
    if (!newAction) return

    // Don't restart the same action
    if (prevActionRef.current === newAction) {
      // Still need to update timeScale in case we toggled walk/run but the action clip name is the same
      if (movementState === 'walk') {
        newAction.timeScale = NINJA.walkSpeed / (NINJA.walkStride / newAction.getClip().duration)
      } else if (movementState === 'run') {
        newAction.timeScale = NINJA.runSpeed / (NINJA.runStride / newAction.getClip().duration)
      } else {
        newAction.timeScale = 1
      }
      return
    }

    // Fade out previous
    if (prevActionRef.current) {
      prevActionRef.current.fadeOut(0.2)
    }

    // Configure new action
    if (movementState === 'victory') {
      newAction.setLoop(THREE.LoopOnce, 1)
      newAction.clampWhenFinished = true
      newAction.timeScale = 1
    } else {
      newAction.setLoop(THREE.LoopRepeat, Infinity)
      newAction.clampWhenFinished = false
      
      // Calculate timeScale for movement animations
      if (movementState === 'walk') {
        const duration = newAction.getClip().duration
        const naturalSpeed = NINJA.walkStride / duration
        newAction.timeScale = NINJA.walkSpeed / naturalSpeed
      } else if (movementState === 'run') {
        const duration = newAction.getClip().duration
        const naturalSpeed = NINJA.runStride / duration
        newAction.timeScale = NINJA.runSpeed / naturalSpeed
      } else {
        newAction.timeScale = 1
      }
    }

    newAction.reset().fadeIn(0.2).play()
    prevActionRef.current = newAction
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movementState, actions])

  // Update position and rotation every frame
  useFrame((_, delta) => {
    if (!group.current) return

    group.current.position.x = ninjaPos.current.x
    group.current.position.z = ninjaPos.current.z
    group.current.position.y = 0

    // Smoothly rotate to face movement direction
    const targetY = runnerDirection
    let diff = targetY - group.current.rotation.y
    while (diff < -Math.PI) diff += Math.PI * 2
    while (diff > Math.PI) diff -= Math.PI * 2
    group.current.rotation.y += diff * delta * 10

  })

  return (
    <group ref={group} dispose={null}>
      <primitive object={characterGroup} scale={NINJA.scale} />
    </group>
  )
}

// Preload all assets
useGLTF.preload(UAL2_PATH)
useGLTF.preload(UAL1_PATH)
useGLTF.preload(RANGER_BODY)
useGLTF.preload(RANGER_ARMS)
useGLTF.preload(RANGER_LEGS)
useGLTF.preload(RANGER_FEET)
useGLTF.preload(RANGER_HOOD)
