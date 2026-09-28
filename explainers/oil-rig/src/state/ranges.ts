import { DRILLING_DRAFT_M, TRANSIT_DRAFT_M, WATER_DEPTH_M } from '../model';

const EXTRA_BALLAST_M = 2;

export const MUD_WEIGHT_RANGE = { min: 1, max: 2.2, step: 0.01 } as const;

export const DRAFT_RANGE = {
  min: TRANSIT_DRAFT_M,
  max: DRILLING_DRAFT_M + EXTRA_BALLAST_M,
  step: 0.5,
  default: DRILLING_DRAFT_M,
} as const;

export const WATER_DEPTH_RANGE = { min: 10, max: 3500, step: 10, default: WATER_DEPTH_M } as const;

export const PRODUCTION_YEARS_RANGE = { min: 0, max: 25, step: 1, default: 0 } as const;
