import type { Phase, Timeline } from '@core/explainer';
import { PATH_CYCLE, PHASE_IDS, PHASE_RANGES } from './model';
import type { PhaseId } from './model';
import {
  PHASE_KEYS,
  describePosition,
  describeSpeed,
  formatPosition,
  formatSpeed,
} from './ui/format';
import { PHASE_TONES } from './ui/palette';

export const SPEED_RANGE = { min: 20, max: 400, default: 80, step: 20 } as const;

const SCRUBBER_STEP_MM = 1;
const FINE_STEP_MM = 2;
const COARSE_STEP_MM = 20;

const JUMP_KEYS: Record<PhaseId, string> = {
  lamp: 'timeline.jump.lamp',
  condenser: 'timeline.jump.condenser',
  specimen: 'timeline.jump.specimen',
  objective: 'timeline.jump.objective',
  tube: 'timeline.jump.tube',
  eyepiece: 'timeline.jump.eyepiece',
  eye: 'timeline.jump.eye',
};

const PATH_PHASES: readonly Phase[] = PHASE_IDS.map((id) => ({
  id,
  start: PHASE_RANGES[id].start,
  end: PHASE_RANGES[id].end,
  labelKey: PHASE_KEYS[id],
  jumpLabelKey: JUMP_KEYS[id],
  tone: PHASE_TONES[id],
}));

function pathMillimetresPerSecond(speed: number): number {
  return speed;
}

export const MICROSCOPE_TIMELINE: Timeline = {
  cycle: PATH_CYCLE,
  loop: true,
  step: SCRUBBER_STEP_MM,
  nudge: { fine: FINE_STEP_MM, coarse: COARSE_STEP_MM },
  labelKey: 'timeline.label',
  phasesLabelKey: 'timeline.phases',
  formatPhase: formatPosition,
  describePhase: describePosition,
  rate: pathMillimetresPerSecond,
  phases: PATH_PHASES,
  speed: {
    min: SPEED_RANGE.min,
    max: SPEED_RANGE.max,
    step: SPEED_RANGE.step,
    labelKey: 'timeline.speed',
    format: formatSpeed,
    describe: describeSpeed,
  },
};
