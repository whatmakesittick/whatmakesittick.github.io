import type { Phase, Timeline } from '@core/explainer';
import { PHASE_IDS } from './ids';
import { BEAT_MS, PHASE_RANGES, REAL_TIME_SPEED, beatMsPerSecond } from './model';
import {
  JUMP_KEYS,
  PHASE_KEYS,
  describePhase,
  describeSpeed,
  formatPhase,
  formatSpeed,
} from './ui/format';
import { PHASE_TONES } from './ui/palette';

export const SPEED_RANGE = { min: 0, max: REAL_TIME_SPEED, step: 1, default: 2 } as const;

const SCRUBBER_STEP_MS = 1;
const FINE_STEP_MS = 5;
const COARSE_STEP_MS = 50;

const BEAT_PHASES: readonly Phase[] = PHASE_IDS.map((id) => ({
  id,
  start: PHASE_RANGES[id].start,
  end: PHASE_RANGES[id].end,
  labelKey: PHASE_KEYS[id],
  jumpLabelKey: JUMP_KEYS[id],
  tone: PHASE_TONES[id],
}));

export const HEART_TIMELINE: Timeline = {
  cycle: BEAT_MS,
  loop: true,
  step: SCRUBBER_STEP_MS,
  nudge: { fine: FINE_STEP_MS, coarse: COARSE_STEP_MS },
  labelKey: 'timeline.label',
  phasesLabelKey: 'timeline.phases',
  formatPhase,
  describePhase,
  rate: beatMsPerSecond,
  phases: BEAT_PHASES,
  speed: {
    min: SPEED_RANGE.min,
    max: SPEED_RANGE.max,
    step: SPEED_RANGE.step,
    labelKey: 'timeline.speed',
    format: formatSpeed,
    describe: describeSpeed,
  },
};
