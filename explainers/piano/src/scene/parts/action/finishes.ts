import type { MaterialFinish } from '@core/scene/materials';

export const ACTION_FINISHES = {
  moulding: { color: '#74432a', roughness: 0.34 },
  shank: { color: '#bf9a66', roughness: 0.32 },
  wippen: { color: '#a57c4e', roughness: 0.44 },
  jack: { color: '#7d5a3a', roughness: 0.4 },
  repetition: { color: '#cba46d', roughness: 0.42 },
  buckskin: { color: '#ddd0b6', roughness: 1 },
  rail: { color: '#5a3e2a', roughness: 0.65 },
  bracket: { color: '#3b3e44', roughness: 0.45, metalness: 0.6 },
  damperWood: { color: '#4e331f', roughness: 0.5 },
  lead: { color: '#7d8188', roughness: 0.45, metalness: 0.5 },
} as const satisfies Record<string, MaterialFinish>;
