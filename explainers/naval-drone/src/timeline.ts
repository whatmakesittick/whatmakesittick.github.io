import type { Phase, Timeline } from '@core/explainer';
import { PHASE_IDS } from './ids';
import { PHASE_RANGES, RUN_SECONDS, SPEED_RANGE, rate } from './model';
import {
  JUMP_KEYS,
  PHASE_KEYS,
  describePhase,
  describeSpeed,
  formatPhase,
  formatSpeed,
} from './ui/format';
import { PHASE_TONES } from './ui/palette';

const SCRUBBER_STEP_SECONDS = 0.1;
const FINE_STEP_SECONDS = 0.5;
const COARSE_STEP_SECONDS = 5;

const RUN_PHASES: readonly Phase[] = PHASE_IDS.map((id) => ({
  id,
  start: PHASE_RANGES[id].start,
  end: PHASE_RANGES[id].end,
  labelKey: PHASE_KEYS[id],
  jumpLabelKey: JUMP_KEYS[id],
  tone: PHASE_TONES[id],
}));

export const NAVAL_DRONE_TIMELINE: Timeline = {
  cycle: RUN_SECONDS,
  loop: false,
  step: SCRUBBER_STEP_SECONDS,
  nudge: { fine: FINE_STEP_SECONDS, coarse: COARSE_STEP_SECONDS },
  labelKey: 'timeline.label',
  phasesLabelKey: 'timeline.phases',
  formatPhase,
  describePhase,
  rate,
  phases: RUN_PHASES,
  speed: {
    min: SPEED_RANGE.min,
    max: SPEED_RANGE.max,
    step: SPEED_RANGE.step,
    labelKey: 'timeline.speed',
    format: formatSpeed,
    describe: describeSpeed,
  },
};

export { SPEED_RANGE };
