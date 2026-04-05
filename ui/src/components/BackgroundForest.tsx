import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { NATURE_PATH } from '../game/constants'

const TREE_TYPES = [
  'CommonTree_1.gltf',
  'CommonTree_3.gltf',
  'TwistedTree_1.gltf',
  'Pine_1.gltf'
]

const FOLIAGE_TYPES = [
  'Fern_1.gltf',
  'Grass_Common_Tall.gltf'
]

const TREE_COUNT = 600
const FOREST_SIZE = 1200

// Simple seeded random
function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

interface MeshAsset {
  geo: THREE.BufferGeometry
  mat: THREE.Material
}

export default function BackgroundForest() {
  const gltfs = {
    trees: [
      useGLTF(NATURE_PATH + TREE_TYPES[0]),
      useGLTF(NATURE_PATH + TREE_TYPES[1]),
      useGLTF(NATURE_PATH + TREE_TYPES[2]),
      useGLTF(NATURE_PATH + TREE_TYPES[3]),
    ],
    foliage: [
      useGLTF(NATURE_PATH + FOLIAGE_TYPES[0]),
      useGLTF(NATURE_PATH + FOLIAGE_TYPES[1]),
    ]
  }

  // Pre-extract ALL meshes from each GLTF for instancing
  const assets = useMemo(() => {
    const extractAll = (gltf: any) => {
      const meshes: MeshAsset[] = []
      gltf.scene.traverse((child: any) => {
        if (child.isMesh) {
          meshes.push({
            geo: child.geometry,
            mat: Array.isArray(child.material) ? child.material[0] : child.material
          })
        }
      })
      return meshes
    }

    return {
      trees: gltfs.trees.map(extractAll),
      foliage: gltfs.foliage.map(extractAll)
    }
  }, [gltfs])

  const placements = useMemo(() => {
    const temp = new THREE.Object3D()
    const treeInstances = assets.trees.map(() => [] as THREE.Matrix4[])
    const foliageInstances = assets.foliage.map(() => [] as THREE.Matrix4[])

    for (let i = 0; i < TREE_COUNT; i++) {
        const seed = i * 1337
        const x = (seededRandom(seed) - 0.5) * FOREST_SIZE
        const z = (seededRandom(seed + 1) - 0.5) * FOREST_SIZE
        
        // Exclude central area
        if (Math.abs(x) < 55 && Math.abs(z) < 55) continue

        const typeIdx = Math.floor(seededRandom(seed + 2) * assets.trees.length)
        const scale = 0.7 + seededRandom(seed + 3) * 0.6
        
        temp.position.set(x, -0.45, z) // Sink slightly for "roots"
        temp.rotation.y = seededRandom(seed + 4) * Math.PI * 2
        temp.scale.set(scale, scale, scale)
        temp.updateMatrix()
        treeInstances[typeIdx].push(temp.matrix.clone())

        // Add grounding foliage to some trees (60% chance)
        if (seededRandom(seed + 5) < 0.6) {
          const fTypeIdx = Math.floor(seededRandom(seed + 6) * assets.foliage.length)
          const fScale = 0.5 + seededRandom(seed + 7) * 0.5
          // Scatter slightly around base
          const offsetX = (seededRandom(seed + 8) - 0.5) * 1.5
          const offsetZ = (seededRandom(seed + 9) - 0.5) * 1.5
          
          temp.position.set(x + offsetX, -0.1, z + offsetZ)
          temp.scale.set(fScale, fScale, fScale)
          temp.updateMatrix()
          foliageInstances[fTypeIdx].push(temp.matrix.clone())
        }
    }

    return { trees: treeInstances, foliage: foliageInstances }
  }, [assets])

  return (
    <>
      {assets.trees.map((meshes, treeIdx) => 
        meshes.map((mesh, meshIdx) => (
          <instancedMesh key={`tree-${treeIdx}-mesh-${meshIdx}`} args={[mesh.geo, mesh.mat, placements.trees[treeIdx].length]}
            onUpdate={(self) => {
              placements.trees[treeIdx].forEach((mat, idx) => self.setMatrixAt(idx, mat))
              self.instanceMatrix.needsUpdate = true
            }}
            castShadow
          />
        ))
      )}
      {assets.foliage.map((meshes, fIdx) => 
        meshes.map((mesh, meshIdx) => (
          <instancedMesh key={`foliage-${fIdx}-mesh-${meshIdx}`} args={[mesh.geo, mesh.mat, placements.foliage[fIdx].length]}
            onUpdate={(self) => {
              placements.foliage[fIdx].forEach((mat, idx) => self.setMatrixAt(idx, mat))
              self.instanceMatrix.needsUpdate = true
            }}
          />
        ))
      )}
    </>
  )
}
