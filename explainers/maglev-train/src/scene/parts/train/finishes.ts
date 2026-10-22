import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../../../theme';

function overlay(offset: number): MaterialFinish {
  return { polygonOffset: true, polygonOffsetFactor: offset, polygonOffsetUnits: offset };
}

export const TRAIN_FINISHES = {
  pane: { color: '#6f8aa6', roughness: 0.06, metalness: 0.7 },
  screen: { ...overlay(-4), color: '#2e4157', roughness: 0.04, metalness: 0.9 },
  screenFrame: { ...overlay(-2), color: THEME.trainBand, roughness: 0.12, metalness: 0.6 },
  lamp: { color: '#fffaf0', emissive: '#fff4d6', emissiveIntensity: 1.4, roughness: 0.15 },
  bezel: { color: '#22282f', roughness: 0.3, metalness: 0.5 },
  tailLamp: { color: '#d8343c', emissive: '#e03a40', emissiveIntensity: 1.1, roughness: 0.3 },
  lining: { color: '#e4e2dc', roughness: 0.8, metalness: 0 },
  carpet: { color: '#56606c', roughness: 0.95, metalness: 0 },
  seat: { color: '#3d5f8c', roughness: 0.85, metalness: 0 },
  seatFrame: { color: '#9aa3ad', roughness: 0.4, metalness: 0.6 },
  cutFace: { color: '#e6e1d6', roughness: 0.7, metalness: 0 },
  marker: { color: THEME.insetLine, emissive: '#bff3ff', emissiveIntensity: 1.2, roughness: 0.5 },
} as const satisfies Record<string, MaterialFinish>;
