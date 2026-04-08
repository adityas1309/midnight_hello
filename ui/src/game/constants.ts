// Shadow Run — Game Constants
// All world dimensions, speeds, zone definitions, and camera settings

export const WORLD = {
  size: 5000,
  groundSize: 10000,
}

export const NINJA = {
  walkSpeed: 5.0,
  runSpeed: 11.0,
  walkStride: 5.5, // Estimated distance covered in one Walk_Loop
  runStride: 9.5,  // Estimated distance covered in one Sprint_Loop
  scale: 1.0,
  startPos: { x: 0, z: 0 },
}

export const ZONES = [
  { id: 'ghost_trail',    x: -25, z: -25, size: 20, triggerRadius: 8  },
  { id: 'river_crossing', x: 25,  z: -15, size: 20, triggerRadius: 8  },
  { id: 'canopy_split',   x: 0,   z: -30, size: 20, triggerRadius: 8  },
  { id: 'stone_drop',     x: -20, z: 20,  size: 20, triggerRadius: 8  },
  { id: 'leaderboard',    x: 0,   z: 0,   size: 25, triggerRadius: 10 },
] as const

export type ZoneDef = typeof ZONES[number]

export const CAMERA = {
  height: 18,
  distance: 14,
  fov: 65,
  lerpSpeed: 0.08,
}

// Asset base paths
export const NATURE_PATH = '/assets/nature/glTF/'
export const MEDIEVAL_PATH = '/assets/medieval/glTF/'
export const NINJA_PATH = '/assets/'
