import type { MaterialFinish } from '@core/scene/materials';

export const MIRROR_BOWL: MaterialFinish = {
  color: '#e4d8ff',
  emissive: '#7a5cc8',
  emissiveIntensity: 0.45,
  roughness: 0.12,
  metalness: 0.7,
};

export const LIT_RIM: MaterialFinish = {
  color: '#f1ecff',
  emissive: '#9a82e0',
  emissiveIntensity: 0.6,
  roughness: 0.2,
  metalness: 0.8,
};
