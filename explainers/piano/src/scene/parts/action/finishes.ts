import type { MaterialFinish } from '@core/scene/materials';

export const ACTION_FINISHES = {
  moulding: { color: '#b48655', roughness: 0.55 },
  shank: { color: '#dcc59a', roughness: 0.5 },
  jack: { color: '#bf9a66', roughness: 0.6 },
  repetition: { color: '#cfae7c', roughness: 0.6 },
  rail: { color: '#6a4b33', roughness: 0.7 },
  bracket: { color: '#3b3e44', roughness: 0.45, metalness: 0.6 },
  damperWood: { color: '#5b3d26', roughness: 0.55 },
  lead: { color: '#7d8188', roughness: 0.45, metalness: 0.5 },
} as const satisfies Record<string, MaterialFinish>;
