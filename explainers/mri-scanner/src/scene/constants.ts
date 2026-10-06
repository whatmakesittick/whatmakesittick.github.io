type Triple = [number, number, number];

export const HAZE = { colour: '#2b3442', near: 18, far: 60 } as const;

export const HIGHLIGHT_DIM = { saturation: 0.55, brightness: 0.62, emissive: 0.4 } as const;

export const SCENE_LIMITS = {
  cameraNear: 0.02,
  cameraFar: 80,
  maxPolarAngle: Math.PI * 0.49,
  cameraMinDistance: 0.4,
  cameraMaxDistance: 14,
} as const;

export const LIGHT_RIG = {
  distance: 10,
  key: { color: '#fff4e6', intensity: 1.6, direction: [0.2, 1, 0.55] as Triple },
  fill: { color: '#9fb8d6', intensity: 0.45, direction: [-0.7, 0.45, 0.35] as Triple },
  rim: { color: '#cfe6ff', intensity: 0.9, direction: [1, 0.3, 0.25] as Triple },
} as const;

export const ROOM_DETAIL = {
  floorTile: 0.5,
  textureSize: 256,
  skirtingHeight: 0.12,
  skirtingInset: 0.004,
  windowDepth: 0.14,
  frameWidth: 0.06,
  glassInset: 0.07,
  lightPanel: { size: 0.6, gap: 0.004, columns: [-1.6, 0, 1.6], rows: [-0.9, 1.0, 2.3] },
  controlRoom: { depth: 1.6, deskTop: 0.75, deskDepth: 0.6, deskHeight: 0.04 },
  monitor: { width: 0.5, height: 0.3, depth: 0.03, lift: 0.22, spread: 0.52, yaw: 0.35 },
  pictureSize: 64,
} as const;

export const SUBJECT_DETAIL = {
  pedestal: { z: [1.35, 2.75] as [number, number], bottomHalf: 0.26, topHalf: 0.2, top: 0.68 },
  foot: { halfWidth: 0.34, height: 0.05, z: [1.2, 2.9] as [number, number] },
  bed: { bottom: 0.7, corner: 0.05 },
  rail: { height: 0.025, depth: 0.012 },
  cradle: { sag: 0.015, segments: 24 },
  pad: { halfWidth: 0.12, length: 0.3, height: 0.035 },
  blanket: { startZ: 0.3, endZ: 1.92, halfWidth: 0.3, columns: 36, rows: 64, loft: 0.02 },
  coil: {
    strut: 0.011,
    ringTube: 0.014,
    strutAngles: [0.75, 1.25, 1.85, 2.35],
    window: { halfAngle: 0.5, z: [-0.04, 0.13] as [number, number] },
    baseArc: [Math.PI * 1.08, Math.PI * 0.84] as [number, number],
  },
} as const;
