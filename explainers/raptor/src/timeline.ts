import type { Phase, Timeline } from '@core/explainer';
import { PHASE_IDS } from './ids';
import { RUN_LENGTH } from './model';
import { PHASE_RANGES } from './model/phases';
import { playbackFactor } from './model/playback';
import {
  JUMP_KEYS,
  PHASE_KEYS,
  describePhase,
  describeSpeed,
  formatPhase,
  formatSpeed,
} from './ui/format';
import { PHASE_TONES } from './ui/palette';

export const SPEED_RANGE = { min: 0, max: 5, step: 1, default: 3 } as const;

const SCRUBBER_STEP_SECONDS = 0.1;
const FINE_STEP_SECONDS = 0.5;
const COARSE_STEP_SECONDS = 5;

const LAUNCH_PHASES: readonly Phase[] = PHASE_IDS.map((id) => ({
  id,
  start: PHASE_RANGES[id].start,
  end: PHASE_RANGES[id].end,
  labelKey: PHASE_KEYS[id],
  jumpLabelKey: JUMP_KEYS[id],
  tone: PHASE_TONES[id],
}));

export const RAPTOR_TIMELINE: Timeline = {
  cycle: RUN_LENGTH,
  loop: false,
  step: SCRUBBER_STEP_SECONDS,
  nudge: { fine: FINE_STEP_SECONDS, coarse: COARSE_STEP_SECONDS },
  labelKey: 'timeline.label',
  phasesLabelKey: 'timeline.phases',
  formatPhase,
  describePhase,
  rate: playbackFactor,
  phases: LAUNCH_PHASES,
  speed: {
    min: SPEED_RANGE.min,
    max: SPEED_RANGE.max,
    step: SPEED_RANGE.step,
    labelKey: 'timeline.speed',
    format: formatSpeed,
    describe: describeSpeed,
  },
};
