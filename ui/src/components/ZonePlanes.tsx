import { useMemo } from 'react'
import { useGLTF, Clone } from '@react-three/drei'
import * as THREE from 'three'
import { ZONES, NATURE_PATH, MEDIEVAL_PATH } from '../game/constants'

// ── Seeded Random ──────────────────────────────────────────

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

type Vec3 = [number, number, number]

function circlePositions(count: number, minR: number, maxR: number, seed: number): Vec3[] {
  const rng = mulberry32(seed)
  const out: Vec3[] = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.6
    const r = minR + rng() * (maxR - minR)
    out.push([Math.cos(angle) * r, 0, Math.sin(angle) * r])
  }
  return out
}

function scatterPositions(count: number, radius: number, seed: number): Vec3[] {
  const rng = mulberry32(seed)
  const out: Vec3[] = []
  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2
    const r = Math.sqrt(rng()) * radius
    out.push([Math.cos(angle) * r, 0, Math.sin(angle) * r])
  }
  return out
}

function ringPositions(count: number, radius: number, seed: number): Vec3[] {
  const rng = mulberry32(seed)
  const out: Vec3[] = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.3
    out.push([Math.cos(angle) * radius, 0, Math.sin(angle) * radius])
  }
  return out
}

// ── Tree Colliders ─────────────────────────────────────────
// Pre-computed at module level for deterministic collision data

interface TreeCollider { x: number; z: number; radius: number }

function computeTreeColliders(): TreeCollider[] {
  const colliders: TreeCollider[] = []
  const addTrees = (zone: typeof ZONES[number], positions: Vec3[]) => {
    for (const p of positions) {
      colliders.push({ x: zone.x + p[0], z: zone.z + p[2], radius: 0.5 })
    }
  }

  const z = ZONES
  // Ghost Trail trees
  addTrees(z[0], circlePositions(8, 8, 11, 1001))
  addTrees(z[0], circlePositions(6, 8, 11, 1002))
  addTrees(z[0], circlePositions(4, 9, 12, 1003))
  addTrees(z[0], circlePositions(3, 9, 12, 1004))
  // River Crossing trees
  addTrees(z[1], circlePositions(6, 8, 11, 2001))
  addTrees(z[1], circlePositions(4, 9, 11, 2002))
  // Canopy Split trees
  addTrees(z[2], circlePositions(10, 8, 11, 3001))
  addTrees(z[2], circlePositions(8, 8, 11, 3002))
  addTrees(z[2], circlePositions(6, 9, 12, 3003))
  addTrees(z[2], circlePositions(4, 9, 12, 3004))
  addTrees(z[2], circlePositions(4, 9, 12, 3005))
  // Stone Drop trees
  addTrees(z[3], circlePositions(4, 9, 12, 4001))
  addTrees(z[3], circlePositions(3, 9, 12, 4002))
  // Central Monument trees
  addTrees(z[4], circlePositions(6, 10, 12, 6001))

  return colliders
}

export const treeColliders: TreeCollider[] = computeTreeColliders()

// ── Reusable Instance Renderer ─────────────────────────────

function ModelInstances({ gltfScene, positions, scale = 1, seed = 42, tintColor, emissiveIntensity = 0 }: {
  gltfScene: THREE.Object3D
  positions: Vec3[]
  scale?: number
  seed?: number
  tintColor?: number
  emissiveIntensity?: number
}) {
  const rng = mulberry32(seed)
  const rotations = useMemo(() => positions.map(() => rng() * Math.PI * 2), [positions.length])

  const clones = useMemo(() => {
    return positions.map((_, i) => {
      const cloned = gltfScene.clone(true)
      cloned.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
          if (tintColor !== undefined) {
            child.material = child.material.clone()
            child.material.color = new THREE.Color(tintColor)
            if (emissiveIntensity > 0) {
              child.material.emissive = new THREE.Color(tintColor)
              child.material.emissiveIntensity = emissiveIntensity
            }
          }
        }
      })
      return cloned
    })
  }, [gltfScene, positions.length, tintColor])

  return (
    <>
      {clones.map((clone, i) => (
        <primitive
          key={i}
          object={clone}
          position={positions[i]}
          rotation={[0, rotations[i], 0]}
          scale={[scale, scale, scale]}
        />
      ))}
    </>
  )
}

// ── Ghost Trail Zone ───────────────────────────────────────
// Dense foggy forest — ring of trees, ferns, mushrooms, grass

const GT = ZONES[0]
const GT_TREE1_POS = circlePositions(8, 8, 11, 1001)
const GT_TREE3_POS = circlePositions(6, 8, 11, 1002)
const GT_TWISTED1_POS = circlePositions(4, 9, 12, 1003)
const GT_TWISTED3_POS = circlePositions(3, 9, 12, 1004)
const GT_FERN_POS = scatterPositions(12, 7, 1010)
const GT_MUSH_POS = scatterPositions(6, 6, 1011)
const GT_BUSH_POS = scatterPositions(8, 7, 1012)
const GT_GRASS_POS = scatterPositions(20, 8, 1013)

function GhostTrailZone() {
  const tree1 = useGLTF(NATURE_PATH + 'CommonTree_1.gltf')
  const tree3 = useGLTF(NATURE_PATH + 'CommonTree_3.gltf')
  const twisted1 = useGLTF(NATURE_PATH + 'TwistedTree_1.gltf')
  const twisted3 = useGLTF(NATURE_PATH + 'TwistedTree_3.gltf')
  const fern = useGLTF(NATURE_PATH + 'Fern_1.gltf')
  const mush = useGLTF(NATURE_PATH + 'Mushroom_Common.gltf')
  const bush = useGLTF(NATURE_PATH + 'Bush_Common.gltf')
  const grass = useGLTF(NATURE_PATH + 'Grass_Common_Tall.gltf')

  return (
    <group position={[GT.x, 0, GT.z]}>
      <ModelInstances gltfScene={tree1.scene} positions={GT_TREE1_POS} scale={1} seed={1101} />
      <ModelInstances gltfScene={tree3.scene} positions={GT_TREE3_POS} scale={1} seed={1102} />
      <ModelInstances gltfScene={twisted1.scene} positions={GT_TWISTED1_POS} scale={1} seed={1103} />
      <ModelInstances gltfScene={twisted3.scene} positions={GT_TWISTED3_POS} scale={1} seed={1104} />
      <ModelInstances gltfScene={fern.scene} positions={GT_FERN_POS} scale={1.2} seed={1110} />
      <ModelInstances gltfScene={mush.scene} positions={GT_MUSH_POS} scale={1.5} seed={1111} />
      <ModelInstances gltfScene={bush.scene} positions={GT_BUSH_POS} scale={1} seed={1112} />
      <ModelInstances gltfScene={grass.scene} positions={GT_GRASS_POS} scale={1} seed={1113} />
    </group>
  )
}

// ── River Crossing Zone ────────────────────────────────────
// River with bridge — trees, rocks, plants, pebbles, water surface

const RC = ZONES[1]
const RC_TREE2_POS = circlePositions(6, 8, 11, 2001)
const RC_TREE4_POS = circlePositions(4, 9, 11, 2002)
const RC_ROCK_PATH_POS = scatterPositions(10, 5, 2010)
const RC_ROCK1_POS = scatterPositions(6, 6, 2011)
const RC_ROCK2_POS = scatterPositions(4, 6, 2012)
const RC_PLANT_POS = scatterPositions(8, 7, 2013)
const RC_FERN_POS = scatterPositions(10, 7, 2014)
const RC_PEBBLE_POS = scatterPositions(15, 5, 2015)

function RiverCrossingZone() {
  const tree2 = useGLTF(NATURE_PATH + 'CommonTree_2.gltf')
  const tree4 = useGLTF(NATURE_PATH + 'CommonTree_4.gltf')
  const rockPath = useGLTF(NATURE_PATH + 'RockPath_Round_Wide.gltf')
  const rock1 = useGLTF(NATURE_PATH + 'Rock_Medium_1.gltf')
  const rock2 = useGLTF(NATURE_PATH + 'Rock_Medium_2.gltf')
  const plant = useGLTF(NATURE_PATH + 'Plant_1_Big.gltf')
  const fern = useGLTF(NATURE_PATH + 'Fern_1.gltf')
  const pebble = useGLTF(NATURE_PATH + 'Pebble_Round_1.gltf')

  return (
    <group position={[RC.x, 0, RC.z]}>
      <ModelInstances gltfScene={tree2.scene} positions={RC_TREE2_POS} scale={1} seed={2101} />
      <ModelInstances gltfScene={tree4.scene} positions={RC_TREE4_POS} scale={1} seed={2102} />
      <ModelInstances gltfScene={rockPath.scene} positions={RC_ROCK_PATH_POS} scale={0.8} seed={2110} />
      <ModelInstances gltfScene={rock1.scene} positions={RC_ROCK1_POS} scale={1.2} seed={2111} />
      <ModelInstances gltfScene={rock2.scene} positions={RC_ROCK2_POS} scale={1.2} seed={2112} />
      <ModelInstances gltfScene={plant.scene} positions={RC_PLANT_POS} scale={1.2} seed={2113} />
      <ModelInstances gltfScene={fern.scene} positions={RC_FERN_POS} scale={1.2} seed={2114} />
      <ModelInstances gltfScene={pebble.scene} positions={RC_PEBBLE_POS} scale={1} seed={2115} />

      {/* Water surface — animated blue plane */}
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 6]} />
        <meshStandardMaterial
          color={0x2a6a8a}
          transparent
          opacity={0.75}
          roughness={0.2}
          metalness={0.4}
        />
      </mesh>
    </group>
  )
}

// ── Canopy Split Zone ──────────────────────────────────────
// Dense overhead canopy — many trees, flowers, ground cover

const CS = ZONES[2]
const CS_TREE1_POS = circlePositions(10, 8, 11, 3001)
const CS_TREE2_POS = circlePositions(8, 8, 11, 3002)
const CS_TREE5_POS = circlePositions(6, 9, 12, 3003)
const CS_PINE1_POS = circlePositions(4, 9, 12, 3004)
const CS_PINE3_POS = circlePositions(4, 9, 12, 3005)
const CS_BUSH_FLOWER_POS = scatterPositions(10, 7, 3010)
const CS_FLOWER_POS = scatterPositions(8, 6, 3011)
const CS_GRASS_POS = scatterPositions(30, 8, 3012)
const CS_PLANT_POS = scatterPositions(6, 7, 3013)

function CanopySplitZone() {
  const tree1 = useGLTF(NATURE_PATH + 'CommonTree_1.gltf')
  const tree2 = useGLTF(NATURE_PATH + 'CommonTree_2.gltf')
  const tree5 = useGLTF(NATURE_PATH + 'CommonTree_5.gltf')
  const pine1 = useGLTF(NATURE_PATH + 'Pine_1.gltf')
  const pine3 = useGLTF(NATURE_PATH + 'Pine_3.gltf')
  const bushFlower = useGLTF(NATURE_PATH + 'Bush_Common_Flowers.gltf')
  const flower = useGLTF(NATURE_PATH + 'Flower_3_Group.gltf')
  const grass = useGLTF(NATURE_PATH + 'Grass_Common_Tall.gltf')
  const plant = useGLTF(NATURE_PATH + 'Plant_1_Big.gltf')

  return (
    <group position={[CS.x, 0, CS.z]}>
      <ModelInstances gltfScene={tree1.scene} positions={CS_TREE1_POS} scale={1} seed={3101} />
      <ModelInstances gltfScene={tree2.scene} positions={CS_TREE2_POS} scale={1} seed={3102} />
      <ModelInstances gltfScene={tree5.scene} positions={CS_TREE5_POS} scale={1} seed={3103} />
      <ModelInstances gltfScene={pine1.scene} positions={CS_PINE1_POS} scale={1} seed={3104} />
      <ModelInstances gltfScene={pine3.scene} positions={CS_PINE3_POS} scale={1} seed={3105} />
      <ModelInstances gltfScene={bushFlower.scene} positions={CS_BUSH_FLOWER_POS} scale={1.2} seed={3110} />
      <ModelInstances gltfScene={flower.scene} positions={CS_FLOWER_POS} scale={1.5} seed={3111} />
      <ModelInstances gltfScene={grass.scene} positions={CS_GRASS_POS} scale={1} seed={3112} />
      <ModelInstances gltfScene={plant.scene} positions={CS_PLANT_POS} scale={1.2} seed={3113} />
    </group>
  )
}

// ── Stone Drop Zone (Ancient Ruins) ────────────────────────
// Twisted trees, rocks, glowing mushrooms, medieval ruins

const SD = ZONES[3]
const SD_TWISTED2_POS = circlePositions(4, 9, 12, 4001)
const SD_TWISTED4_POS = circlePositions(3, 9, 12, 4002)
const SD_ROCK1_POS = scatterPositions(8, 6, 4010)
const SD_ROCK3_POS = scatterPositions(6, 6, 4011)
const SD_MUSH_POS = scatterPositions(8, 5, 4012)
const SD_FERN_POS = scatterPositions(10, 7, 4013)
const SD_CLOVER_POS = scatterPositions(12, 7, 4014)
const SD_WALL_POS = ringPositions(6, 5, 4020)
const SD_PILLAR_POS = ringPositions(4, 6, 4021)

function StoneDropZone() {
  const twisted2 = useGLTF(NATURE_PATH + 'TwistedTree_2.gltf')
  const twisted4 = useGLTF(NATURE_PATH + 'TwistedTree_4.gltf')
  const rock1 = useGLTF(NATURE_PATH + 'Rock_Medium_1.gltf')
  const rock3 = useGLTF(NATURE_PATH + 'Rock_Medium_3.gltf')
  const mushLaet = useGLTF(NATURE_PATH + 'Mushroom_Laetiporus.gltf')
  const fern = useGLTF(NATURE_PATH + 'Fern_1.gltf')
  const clover = useGLTF(NATURE_PATH + 'Clover_1.gltf')
  const wall = useGLTF(MEDIEVAL_PATH + 'Wall_UnevenBrick_Straight.gltf')
  const pillar = useGLTF(MEDIEVAL_PATH + 'Prop_Support.gltf')

  return (
    <group position={[SD.x, 0, SD.z]}>
      <ModelInstances gltfScene={twisted2.scene} positions={SD_TWISTED2_POS} scale={1} seed={4101} />
      <ModelInstances gltfScene={twisted4.scene} positions={SD_TWISTED4_POS} scale={1} seed={4102} />
      <ModelInstances gltfScene={rock1.scene} positions={SD_ROCK1_POS} scale={1.5} seed={4110} />
      <ModelInstances gltfScene={rock3.scene} positions={SD_ROCK3_POS} scale={1.5} seed={4111} />
      <ModelInstances gltfScene={mushLaet.scene} positions={SD_MUSH_POS} scale={1.8} seed={4112}
        tintColor={0x88ff44} emissiveIntensity={0.3} />
      <ModelInstances gltfScene={fern.scene} positions={SD_FERN_POS} scale={1.2} seed={4113} />
      <ModelInstances gltfScene={clover.scene} positions={SD_CLOVER_POS} scale={1.5} seed={4114} />
      {/* Medieval stone ruins — broken wall segments arranged in ring */}
      <ModelInstances gltfScene={wall.scene} positions={SD_WALL_POS} scale={1} seed={4120} />
      <ModelInstances gltfScene={pillar.scene} positions={SD_PILLAR_POS} scale={1.2} seed={4121} />
      {/* Central stone platform */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3, 16]} />
        <meshStandardMaterial color={0x5a5a5a} roughness={0.95} metalness={0.1} />
      </mesh>
    </group>
  )
}



// ── Central Monument Zone ──────────────────────────────────
// Framing trees, stone paths, medieval obelisk/tower at center

const CM = ZONES[4]
const CM_TWISTED1_POS = circlePositions(6, 10, 12, 6001)
const CM_ROCK1_POS = scatterPositions(8, 7, 6010)
const CM_ROCK2_POS = scatterPositions(6, 7, 6011)
const CM_ROCKPATH_POS: Vec3[] = [
  [-8, 0, 0], [-6, 0, 0], [-4, 0, 0], [-2, 0, 0],
  [2, 0, 0], [4, 0, 0], [6, 0, 0], [8, 0, 0],
  [0, 0, -4], [0, 0, -6], [0, 0, 4], [0, 0, 6],
]
const CM_MUSH_POS = scatterPositions(4, 5, 6012)
const CM_FERN_POS = scatterPositions(8, 8, 6013)

function CentralMonumentZone() {
  const twisted1 = useGLTF(NATURE_PATH + 'TwistedTree_1.gltf')
  const rock1 = useGLTF(NATURE_PATH + 'Rock_Medium_1.gltf')
  const rock2 = useGLTF(NATURE_PATH + 'Rock_Medium_2.gltf')
  const rockPathSq = useGLTF(NATURE_PATH + 'RockPath_Square_Wide.gltf')
  const mushCommon = useGLTF(NATURE_PATH + 'Mushroom_Common.gltf')
  const fern = useGLTF(NATURE_PATH + 'Fern_1.gltf')
  const chimney = useGLTF(MEDIEVAL_PATH + 'Prop_Chimney.gltf')
  const floor = useGLTF(MEDIEVAL_PATH + 'Floor_UnevenBrick.gltf')
  const stairs = useGLTF(MEDIEVAL_PATH + 'Stairs_Exterior_Straight.gltf')

  return (
    <group position={[CM.x, 0, CM.z]}>
      <ModelInstances gltfScene={twisted1.scene} positions={CM_TWISTED1_POS} scale={1} seed={6101} />
      <ModelInstances gltfScene={rock1.scene} positions={CM_ROCK1_POS} scale={1.5} seed={6110} />
      <ModelInstances gltfScene={rock2.scene} positions={CM_ROCK2_POS} scale={1.5} seed={6111} />
      <ModelInstances gltfScene={rockPathSq.scene} positions={CM_ROCKPATH_POS} scale={0.8} seed={6112} />
      <ModelInstances gltfScene={mushCommon.scene} positions={CM_MUSH_POS} scale={1.5} seed={6113} />
      <ModelInstances gltfScene={fern.scene} positions={CM_FERN_POS} scale={1.2} seed={6114} />

      {/* Central obelisk tower */}
      <primitive object={chimney.scene.clone(true)} position={[0, 0, 0]} scale={[1.5, 2, 1.5]} />

      {/* Stone platform base */}
      <primitive object={floor.scene.clone(true)} position={[-1, 0.01, -1]} scale={[2.5, 1, 2.5]} />
      <primitive object={floor.scene.clone(true)} position={[1, 0.01, -1]} scale={[2.5, 1, 2.5]} />
      <primitive object={floor.scene.clone(true)} position={[-1, 0.01, 1]} scale={[2.5, 1, 2.5]} />
      <primitive object={floor.scene.clone(true)} position={[1, 0.01, 1]} scale={[2.5, 1, 2.5]} />

      {/* Approach stairs */}
      <primitive object={stairs.scene.clone(true)} position={[0, 0, 4]} rotation={[0, Math.PI, 0]} scale={[1.5, 1, 1.5]} />
      <primitive object={stairs.scene.clone(true)} position={[0, 0, -4]} scale={[1.5, 1, 1.5]} />

      {/* Warm glow on the monument */}
      <pointLight position={[0, 4, 0]} intensity={2} color={0xd4a745} distance={12} decay={2} />
    </group>
  )
}

// ── Main Component ─────────────────────────────────────────

export default function ZonePlanes() {
  return (
    <>
      <GhostTrailZone />
      <RiverCrossingZone />
      <CanopySplitZone />
      <StoneDropZone />
      <CentralMonumentZone />
    </>
  )
}

// ── Preload all models ─────────────────────────────────────

const natureModels = [
  'CommonTree_1', 'CommonTree_2', 'CommonTree_3', 'CommonTree_4', 'CommonTree_5',
  'TwistedTree_1', 'TwistedTree_2', 'TwistedTree_3', 'TwistedTree_4', 'TwistedTree_5',
  'DeadTree_1', 'DeadTree_3', 'DeadTree_5',
  'Pine_1', 'Pine_3',
  'Bush_Common', 'Bush_Common_Flowers',
  'Fern_1', 'Clover_1',
  'Mushroom_Common', 'Mushroom_Laetiporus',
  'Grass_Common_Tall', 'Grass_Wispy_Tall',
  'Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3',
  'RockPath_Round_Wide', 'RockPath_Square_Wide',
  'Pebble_Round_1',
  'Plant_1_Big', 'Plant_7_Big',
  'Flower_3_Group',
]

const medievalModels = [
  'Wall_UnevenBrick_Straight', 'Prop_Support', 'Prop_Chimney',
  'Floor_UnevenBrick', 'Stairs_Exterior_Straight',
]

natureModels.forEach(m => useGLTF.preload(NATURE_PATH + m + '.gltf'))
medievalModels.forEach(m => useGLTF.preload(MEDIEVAL_PATH + m + '.gltf'))
