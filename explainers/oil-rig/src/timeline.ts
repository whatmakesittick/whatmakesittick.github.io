import type { Phase, Timeline } from '@core/explainer';
import { JOURNEY_CYCLE, JOURNEY_STEP_M, PHASE_IDS, PHASE_RANGES } from './model';
import {
  JUMP_KEYS,
  PHASE_KEYS,
  describeDepth,
  describeSpeed,
  formatMetres,
  formatSpeed,
} from './ui/format';
import { PHASE_TONES } from './ui/palette';

export const SPEED_RANGE = { min: 20, max: 400, default: 80, step: 20 } as const;

const FINE_STEP_M = 5;
const COARSE_STEP_M = 100;

const JOURNEY_PHASES: readonly Phase[] = PHASE_IDS.map((id) => ({
  id,
  start: PHASE_RANGES[id].start,
  end: PHASE_RANGES[id].end,
  labelKey: PHASE_KEYS[id],
  jumpLabelKey: JUMP_KEYS[id],
  tone: PHASE_TONES[id],
}));

function drilledMetresPerSecond(speed: number): number {
  return speed;
}

export const OIL_RIG_TIMELINE: Timeline = {
  cycle: JOURNEY_CYCLE,
  loop: true,
  step: JOURNEY_STEP_M,
  nudge: { fine: FINE_STEP_M, coarse: COARSE_STEP_M },
  labelKey: 'timeline.label',
  phasesLabelKey: 'timeline.phases',
  formatPhase: formatMetres,
  describePhase: describeDepth,
  rate: drilledMetresPerSecond,
  phases: JOURNEY_PHASES,
  speed: {
    min: SPEED_RANGE.min,
    max: SPEED_RANGE.max,
    step: SPEED_RANGE.step,
    labelKey: 'timeline.speed',
    format: formatSpeed,
    describe: describeSpeed,
  },
};
