import { FULL_TURN, clamp } from '@core/math';
import { SEAWATER_DENSITY } from './pressure';

export const DRILLING_DRAFT_M = 21;
export const TRANSIT_DRAFT_M = 9.5;
export const PONTOON = { count: 2, length: 110, width: 18, height: 9 } as const;
export const COLUMN = { count: 4, side: 17 } as const;
export const DECK_UNDERSIDE_ABOVE_KEEL_M = 33;
export const GRAVITY = 9.81;
export const SWELL_PERIOD_S = 10;

export const RIG_TYPE_IDS = ['jackUp', 'jacket', 'tlp', 'spar', 'semi', 'drillship'] as const;
export type RigTypeId = (typeof RIG_TYPE_IDS)[number];

export type Footing = 'seabed' | 'floating';

export interface RigType {
  footing: Footing;
  maxWaterDepth: number;
}

export const RIG_TYPES: Record<RigTypeId, RigType> = {
  jackUp: { footing: 'seabed', maxWaterDepth: 150 },
  jacket: { footing: 'seabed', maxWaterDepth: 412 },
  tlp: { footing: 'floating', maxWaterDepth: 1584 },
  spar: { footing: 'floating', maxWaterDepth: 2400 },
  semi: { footing: 'floating', maxWaterDepth: 3000 },
  drillship: { footing: 'floating', maxWaterDepth: 3628 },
};

const MIN_WATER_DEPTH: Record<Footing, number> = { seabed: 0, floating: DRILLING_DRAFT_M };

function pontoonVolume(draft: number): number {
  const { count, length, width, height } = PONTOON;
  return count * length * width * clamp(draft, 0, height);
}

function columnVolume(draft: number): number {
  return COLUMN.count * COLUMN.side ** 2 * Math.max(0, draft - PONTOON.height);
}

export function displacementT(draft: number): number {
  return SEAWATER_DENSITY * (pontoonVolume(draft) + columnVolume(draft));
}

export function airGapM(draft: number): number {
  return DECK_UNDERSIDE_ABOVE_KEEL_M - draft;
}

export function wavelengthM(periodSeconds: number): number {
  return (GRAVITY * periodSeconds ** 2) / FULL_TURN;
}

export function waveMotionShare(depth: number, periodSeconds: number): number {
  return Math.exp((-FULL_TURN * depth) / wavelengthM(periodSeconds));
}

export function keelWaveMotion(draft: number): number {
  return waveMotionShare(draft, SWELL_PERIOD_S);
}

export function minWaterDepth(type: RigTypeId): number {
  return MIN_WATER_DEPTH[RIG_TYPES[type].footing];
}

export function canWorkIn(type: RigTypeId, waterDepth: number): boolean {
  return waterDepth >= minWaterDepth(type) && waterDepth <= RIG_TYPES[type].maxWaterDepth;
}

export function rigsFor(waterDepth: number): RigTypeId[] {
  return RIG_TYPE_IDS.filter((type) => canWorkIn(type, waterDepth));
}
