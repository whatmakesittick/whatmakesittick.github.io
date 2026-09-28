import { layerById } from './rocks';
import {
  DRILL_FLOOR_ABOVE_SEA_M,
  RISER_LANDED_DEPTH_M,
  SEABED_DEPTH_M,
  TOTAL_DEPTH_M,
} from './wellPlan';

export const PHASE_IDS = [
  'deck',
  'sea',
  'topHole',
  'overburden',
  'seal',
  'reservoir',
  'bottom',
] as const;
export type PhaseId = (typeof PHASE_IDS)[number];

export interface DepthRange {
  start: number;
  end: number;
}

const SEAL = layerById('seal');
const RESERVOIR = layerById('reservoir');

export const PHASE_RANGES: Record<PhaseId, DepthRange> = {
  deck: { start: 0, end: DRILL_FLOOR_ABOVE_SEA_M },
  sea: { start: DRILL_FLOOR_ABOVE_SEA_M, end: SEABED_DEPTH_M },
  topHole: { start: SEABED_DEPTH_M, end: RISER_LANDED_DEPTH_M },
  overburden: { start: RISER_LANDED_DEPTH_M, end: SEAL.top },
  seal: { start: SEAL.top, end: SEAL.bottom },
  reservoir: { start: RESERVOIR.top, end: RESERVOIR.bottom },
  bottom: { start: RESERVOIR.bottom, end: TOTAL_DEPTH_M },
};

export const JOURNEY_CYCLE = TOTAL_DEPTH_M;
export const JOURNEY_STEP_M = 1;
export const FINAL_DEPTH_M = JOURNEY_CYCLE - JOURNEY_STEP_M;

export function phaseAt(depth: number): PhaseId {
  return PHASE_IDS.find((id) => depth < PHASE_RANGES[id].end) ?? 'bottom';
}
