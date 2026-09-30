import type { Phase, Timeline } from '@core/explainer';
import { PHASE_IDS } from './ids';
import { CENTRE_TIME, PHASE_RANGES } from './model';
import { SPEED_RANGE, playbackFactor } from './playback';
import {
  JUMP_KEYS,
  PHASE_KEYS,
  describePhase,
  describeSpeed,
  formatPhase,
  formatSpeed,
} from './ui/format';
import { PHASE_TONES } from './ui/palette';

const SCRUBBER_STEP_SECONDS = 0.5;
const FINE_STEP_SECONDS = 1;
const COARSE_STEP_SECONDS = 30;

const FALL_PHASES: readonly Phase[] = PHASE_IDS.map((id) => ({
  id,
  start: PHASE_RANGES[id].start,
  end: PHASE_RANGES[id].end,
  labelKey: PHASE_KEYS[id],
  jumpLabelKey: JUMP_KEYS[id],
  tone: PHASE_TONES[id],
}));

export const BLACK_HOLE_TIMELINE: Timeline = {
  cycle: CENTRE_TIME,
  loop: false,
  step: SCRUBBER_STEP_SECONDS,
  nudge: { fine: FINE_STEP_SECONDS, coarse: COARSE_STEP_SECONDS },
  labelKey: 'timeline.label',
  phasesLabelKey: 'timeline.phases',
  formatPhase,
  describePhase,
  rate: playbackFactor,
  phases: FALL_PHASES,
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
