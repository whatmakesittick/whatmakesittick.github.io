import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../../../theme';
import { GROUND_LIFT_M } from '../../constants';
import { FINISHES } from '../../finishes';

const ROAD_OFFSET = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 };
const CABLE_OFFSET = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 };
const MARKER_OFFSET = { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -12 };

export const ROUTE = { offset: 30, towerClearance: 3 } as const;

export const ROAD = {
  width: 10,
  lift: GROUND_LIFT_M,
  padBehind: 16,
  padWidth: 36,
  period: 1,
  widenPerMetre: 0.0006,
} as const;

export const ROAD_FINISH: MaterialFinish = { ...FINISHES.gravel, ...ROAD_OFFSET };

export const CABLE = {
  width: 4,
  lift: GROUND_LIFT_M + 0.4,
  dashPeriod: 70,
  flowSpeed: 160,
  widenPerMetre: 0.0011,
  glow: 1.6,
} as const;

export const CABLE_FINISH: MaterialFinish = {
  color: THEME.cable,
  emissive: THEME.cable,
  emissiveIntensity: CABLE.glow,
  roughness: 0.9,
  metalness: 0,
  ...CABLE_OFFSET,
};

export const MARKER = {
  width: 6,
  lift: GROUND_LIFT_M + 0.8,
  tickLength: 90,
  labelLift: 30,
  widenPerMetre: 0.0011,
} as const;

export const MARKER_FINISH: MaterialFinish = { ...FINISHES.spacing, ...MARKER_OFFSET };

export const PLUME = {
  radialSegments: 32,
  lengthSegments: 14,
  lengthStepD: 0.25,
  fadeInD: 0.6,
  fadeOutFrom: 0.3,
  rimPower: 1,
  groundFade: 70,
  minOpacity: 0.25,
  maxOpacity: 0.45,
  fullStrength: 0.6,
  opacityStep: 0.05,
  streakPeriod: 900,
  streakBands: 2,
  streakTimeScale: 9,
  glow: 0.5,
} as const;
