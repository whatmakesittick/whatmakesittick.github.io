import type { Phase, Timeline } from '@core/explainer';
import { FLIGHT_CYCLE, PHASE_IDS, PHASE_RANGES, formatClock } from './model';
import type { PhaseId } from './model';
import { PHASE_KEYS, describeFlightTime, describeTimeLapse, formatTimeLapse } from './ui/format';
import { PHASE_TONES } from './ui/palette';

export const SPEED_RANGE = { min: 15, max: 240, default: 60, step: 15 } as const;

const SCRUBBER_STEP_SECONDS = 5;
const FINE_STEP_SECONDS = 15;
const COARSE_STEP_SECONDS = 60;

const JUMP_KEYS: Record<PhaseId, string> = {
  thermal: 'timeline.jump.thermal',
  glide: 'timeline.jump.glide',
  ridge: 'timeline.jump.ridge',
  wave: 'timeline.jump.wave',
  final: 'timeline.jump.final',
};

const FLIGHT_PHASES: readonly Phase[] = PHASE_IDS.map((id) => ({
  id,
  start: PHASE_RANGES[id].start,
  end: PHASE_RANGES[id].end,
  labelKey: PHASE_KEYS[id],
  jumpLabelKey: JUMP_KEYS[id],
  tone: PHASE_TONES[id],
}));

function flightSecondsPerSecond(timeLapse: number): number {
  return timeLapse;
}

export const GLIDER_TIMELINE: Timeline = {
  cycle: FLIGHT_CYCLE,
  loop: true,
  step: SCRUBBER_STEP_SECONDS,
  nudge: { fine: FINE_STEP_SECONDS, coarse: COARSE_STEP_SECONDS },
  labelKey: 'timeline.label',
  phasesLabelKey: 'timeline.phases',
  formatPhase: formatClock,
  describePhase: describeFlightTime,
  rate: flightSecondsPerSecond,
  phases: FLIGHT_PHASES,
  speed: {
    min: SPEED_RANGE.min,
    max: SPEED_RANGE.max,
    step: SPEED_RANGE.step,
    labelKey: 'timeline.speed',
    format: formatTimeLapse,
    describe: describeTimeLapse,
  },
};
