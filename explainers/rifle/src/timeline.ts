import type { Phase, Timeline } from '@core/explainer';
import { PHASE_IDS } from './ids';
import { CYCLE_UNITS, PHASE_RANGES, SPEED_RANGE, rate } from './model';
import {
  JUMP_KEYS,
  PHASE_KEYS,
  describePhase,
  describeSpeed,
  formatPhase,
  formatSpeed,
} from './ui/format';
import { PHASE_TONES } from './ui/palette';

const SCRUBBER_STEP_UNITS = 0.1;
const FINE_STEP_UNITS = 1;
const COARSE_STEP_UNITS = 10;

const CYCLE_PHASES: readonly Phase[] = PHASE_IDS.map((id) => ({
  id,
  start: PHASE_RANGES[id].start,
  end: PHASE_RANGES[id].end,
  labelKey: PHASE_KEYS[id],
  jumpLabelKey: JUMP_KEYS[id],
  tone: PHASE_TONES[id],
}));

export const RIFLE_TIMELINE: Timeline = {
  cycle: CYCLE_UNITS,
  step: SCRUBBER_STEP_UNITS,
  nudge: { fine: FINE_STEP_UNITS, coarse: COARSE_STEP_UNITS },
  labelKey: 'timeline.label',
  phasesLabelKey: 'timeline.phases',
  formatPhase,
  describePhase,
  rate,
  phases: CYCLE_PHASES,
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
