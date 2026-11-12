export const SCENE_LIMITS = {
  cameraNear: 0.05,
  cameraFar: 400,
  maxPolarAngle: Math.PI * 0.6,
  cameraMinDistance: 0.5,
  cameraMaxDistance: 70,
} as const;

export const HIGHLIGHT_DIM = { saturation: 0.4, brightness: 0.7, emissive: 0.3 } as const;
