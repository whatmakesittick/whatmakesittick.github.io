import type { Phase, Timeline } from '@core/explainer';
import { PHASE_IDS } from './ids';
import { PHASE_RANGES, SORTIE_SECONDS, SPEED_RANGE, rate } from './model';
import {
  JUMP_KEYS,
  PHASE_KEYS,
  describePhase,
  describeSpeed,
  formatPhase,
  formatSpeed,
} from './ui/format';
import { PHASE_TONES } from './ui/palette';

const SCRUBBER_STEP_S = 0.1;
const FINE_STEP_S = 0.5;
const COARSE_STEP_S = 5;

const SORTIE_PHASES: readonly Phase[] = PHASE_IDS.map((id) => ({
  id,
  start: PHASE_RANGES[id].start,
  end: PHASE_RANGES[id].end,
  labelKey: PHASE_KEYS[id],
  jumpLabelKey: JUMP_KEYS[id],
  tone: PHASE_TONES[id],
}));

export const FPV_TIMELINE: Timeline = {
  cycle: SORTIE_SECONDS,
  loop: false,
  step: SCRUBBER_STEP_S,
  nudge: { fine: FINE_STEP_S, coarse: COARSE_STEP_S },
  labelKey: 'timeline.label',
  phasesLabelKey: 'timeline.phases',
  formatPhase,
  describePhase,
  rate,
  phases: SORTIE_PHASES,
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
