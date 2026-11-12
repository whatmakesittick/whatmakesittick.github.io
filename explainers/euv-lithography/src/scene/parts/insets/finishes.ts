import type { MaterialFinish } from '@core/scene/materials';

export const INSET_FINISHES = {
  hair: { color: '#3b2a20', roughness: 0.85 },
  resist: {
    color: '#eef2f7',
    roughness: 0.55,
    metalness: 0,
    emissive: '#8fa0d8',
    emissiveIntensity: 0.35,
  },
  substrate: { color: '#6b7482', roughness: 0.22, metalness: 0.75 },
  footShadow: { color: '#14181f', roughness: 0.9 },
  virusRing: { color: '#b5525f', roughness: 0.45 },
  virusSpike: { color: '#d9b27a', roughness: 0.4 },
  leader: { color: '#d8dee6', roughness: 0.5, emissive: '#d8dee6', emissiveIntensity: 0.35 },
} as const satisfies Record<string, MaterialFinish>;
