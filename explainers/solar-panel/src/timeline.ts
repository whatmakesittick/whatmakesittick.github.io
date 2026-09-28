import type { Phase, Timeline } from '@core/explainer';
import { PHASE_IDS } from './ids';
import { DAY_CYCLE_MIN, PHASE_RANGES } from './model';
import {
  JUMP_KEYS,
  PHASE_KEYS,
  describePhase,
  describeSpeed,
  formatPhase,
  formatSpeed,
} from './ui/format';
import { PHASE_TONES } from './ui/palette';

export const SPEED_RANGE = { min: 2, max: 60, step: 2, default: 10 } as const;

const SCRUBBER_STEP_MIN = 1;
const FINE_STEP_MIN = 5;
const COARSE_STEP_MIN = 60;

const DAY_PHASES: readonly Phase[] = PHASE_IDS.map((id) => ({
  id,
  start: PHASE_RANGES[id].start,
  end: PHASE_RANGES[id].end,
  labelKey: PHASE_KEYS[id],
  jumpLabelKey: JUMP_KEYS[id],
  tone: PHASE_TONES[id],
}));

export function dayMinutesPerSecond(speed: number): number {
  return speed;
}

export const SOLAR_PANEL_TIMELINE: Timeline = {
  cycle: DAY_CYCLE_MIN,
  loop: true,
  step: SCRUBBER_STEP_MIN,
  nudge: { fine: FINE_STEP_MIN, coarse: COARSE_STEP_MIN },
  labelKey: 'timeline.label',
  phasesLabelKey: 'timeline.phases',
  formatPhase,
  describePhase,
  rate: dayMinutesPerSecond,
  phases: DAY_PHASES,
  speed: {
    min: SPEED_RANGE.min,
    max: SPEED_RANGE.max,
    step: SPEED_RANGE.step,
    labelKey: 'timeline.speed',
    format: formatSpeed,
    describe: describeSpeed,
  },
};
