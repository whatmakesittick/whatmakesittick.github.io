import type { Phase, Timeline } from '@core/explainer';
import { t } from '@core/i18n';
import { AZIMUTH_CYCLE, HALF_TURN, ROTOR_HALVES, degreesPerSecond, rotorHalf } from './model';
import type { RotorHalf } from './model';
import { HALF_KEYS, describeRpm, formatDegrees, formatRpm } from './ui/format';
import { HALF_TONES } from './ui/palette';

export const RPM_RANGE = { min: 10, max: 400, default: 40, step: 10 } as const;

const SCRUBBER_STEP_DEGREES = 1;
const FINE_STEP_DEGREES = 2;
const COARSE_STEP_DEGREES = 15;

const HALF_START: Record<RotorHalf, number> = { advancing: 0, retreating: HALF_TURN };

const JUMP_KEYS: Record<RotorHalf, string> = {
  advancing: 'timeline.jump.advancing',
  retreating: 'timeline.jump.retreating',
};

const AZIMUTH_VALUE_KEYS: Record<RotorHalf, string> = {
  advancing: 'timeline.value.advancing',
  retreating: 'timeline.value.retreating',
};

const HALF_PHASES: readonly Phase[] = ROTOR_HALVES.map((half) => ({
  id: half,
  start: HALF_START[half],
  end: HALF_START[half] + HALF_TURN,
  labelKey: HALF_KEYS[half],
  jumpLabelKey: JUMP_KEYS[half],
  tone: HALF_TONES[half],
}));

function describeAzimuth(azimuth: number): string {
  return t(AZIMUTH_VALUE_KEYS[rotorHalf(azimuth)], { angle: formatDegrees(azimuth) });
}

export const HELICOPTER_TIMELINE: Timeline = {
  cycle: AZIMUTH_CYCLE,
  step: SCRUBBER_STEP_DEGREES,
  nudge: { fine: FINE_STEP_DEGREES, coarse: COARSE_STEP_DEGREES },
  labelKey: 'timeline.label',
  phasesLabelKey: 'timeline.phases',
  formatPhase: formatDegrees,
  describePhase: describeAzimuth,
  rate: degreesPerSecond,
  phases: HALF_PHASES,
  speed: {
    min: RPM_RANGE.min,
    max: RPM_RANGE.max,
    step: RPM_RANGE.step,
    labelKey: 'timeline.speed',
    format: formatRpm,
    describe: describeRpm,
  },
};
