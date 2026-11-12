import type { MaterialFinish } from '@core/scene/materials';

export const INSET_FINISHES = {
  hair: { color: '#3b2a20', roughness: 0.85 },
  resist: {
    color: '#d8dee6',
    roughness: 0.4,
    metalness: 0.1,
    emissive: '#6a7bff',
    emissiveIntensity: 0.5,
  },
  substrate: { color: '#5b6573', roughness: 0.35, metalness: 0.7 },
  virusRing: { color: '#b5525f', roughness: 0.45 },
  virusSpike: { color: '#d9b27a', roughness: 0.4 },
  leader: { color: '#d8dee6', roughness: 0.5, emissive: '#d8dee6', emissiveIntensity: 0.35 },
} as const satisfies Record<string, MaterialFinish>;
