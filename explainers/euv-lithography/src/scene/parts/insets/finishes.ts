import type { MaterialFinish } from '@core/scene/materials';

export const INSET_FINISHES = {
  hair: { color: '#3b2a20', roughness: 0.85 },
  resist: { color: '#79d6b4', roughness: 0.4, metalness: 0.1 },
  substrate: { color: '#5b6573', roughness: 0.35, metalness: 0.7 },
  virusRing: { color: '#e0607e', roughness: 0.45 },
  virusSpike: { color: '#f1d36b', roughness: 0.4 },
  leader: { color: '#d8dee6', roughness: 0.5, emissive: '#d8dee6', emissiveIntensity: 0.35 },
} as const satisfies Record<string, MaterialFinish>;
