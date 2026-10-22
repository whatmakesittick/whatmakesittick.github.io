import { TRAIN, VIEW_AHEAD_M, VIEW_BEHIND_M } from '../../../model';
import { PACKS, RAIL, TRAY } from './constants';

export const SECTION_EDGE = { behind: 6, ahead: 40 } as const;

export const BAND_DRIFT_MS = 1.1;

export const STATOR_SHADING = {
  bandGlow: 2.4,
  bandShade: 0.65,
  endFaceGlow: 0.6,
  plateShade: 0.3,
  plateWidth: 0.12,
  slotShade: 0.85,
  cableBand: 0.03,
  cableColour: 0.025,
  detailNear: 18,
  detailFar: 70,
} as const;

const LANE_Z = RAIL.outer + 0.03;

export const POWERED_STRIP = {
  y: 9.72,
  z: LANE_Z,
  halfHeight: 0.42,
  opacity: 0.42,
  core: 0.55,
} as const;

export const WAVE_HALO = {
  y: (PACKS.bottom + PACKS.top) / 2,
  z: LANE_Z + 0.01,
  halfHeight: 0.13,
  opacity: 0.9,
} as const;

export const POWER_FLOW = {
  y: (TRAY.bottom + TRAY.top) / 2,
  z: TRAY.outer + 0.05,
  halfHeight: 0.2,
  spacing: 2.6,
  slant: 0.32,
  stroke: 0.14,
  outline: 0.06,
  speed: 9,
  trainEnd: TRAIN.noseX,
  trainFade: 10,
  window: [-VIEW_BEHIND_M, VIEW_AHEAD_M] as const,
  windowFade: 80,
} as const;

export const OVERLAY_RENDER_ORDER = 2;
