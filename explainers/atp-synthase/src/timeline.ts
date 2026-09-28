import type { Phase, Timeline } from '@core/explainer';
import { PHASE_IDS } from './ids';
import {
  FULL_TURN_DEG,
  HUMAN_BLADE_COUNT,
  REAL_TIME_SPEED,
  bladePitchDeg,
  degreesPerSecond,
  phaseRange,
} from './model';
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

const SCRUBBER_STEP_DEG = 1;
const FINE_STEP_DEG = 1;
const COARSE_STEP_DEG = bladePitchDeg(HUMAN_BLADE_COUNT);

const ATP_PHASES: readonly Phase[] = PHASE_IDS.map((id) => ({
  id,
  ...phaseRange(id),
  labelKey: PHASE_KEYS[id],
  jumpLabelKey: JUMP_KEYS[id],
  tone: PHASE_TONES[id],
}));

export const ATP_TIMELINE: Timeline = {
  cycle: FULL_TURN_DEG,
  loop: true,
  step: SCRUBBER_STEP_DEG,
  nudge: { fine: FINE_STEP_DEG, coarse: COARSE_STEP_DEG },
  labelKey: 'timeline.label',
  phasesLabelKey: 'timeline.phases',
  formatPhase,
  describePhase,
  rate: degreesPerSecond,
  phases: ATP_PHASES,
  speed: {
    min: SPEED_RANGE.min,
    max: SPEED_RANGE.max,
    step: SPEED_RANGE.step,
    labelKey: 'timeline.speed',
    format: formatSpeed,
    describe: describeSpeed,
  },
};
