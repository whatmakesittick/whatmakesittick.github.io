import type { Phase, Timeline } from '@core/explainer';
import { t } from '@core/i18n';
import {
  CYCLE_DEGREES,
  REVOLUTION_DEGREES,
  STROKES,
  STROKE_DEGREES,
  STROKE_START,
  strokeAt,
} from './model';
import type { Stroke } from './model';
import { STROKE_KEYS, describeRpm, formatDegrees, formatRpm } from './ui/format';
import { STROKE_TONES } from './ui/palette';

export const RPM_RANGE = { min: 5, max: 600, default: 60, step: 5 } as const;

const SECONDS_PER_MINUTE = 60;
const SCRUBBER_STEP_DEGREES = 1;
const FINE_STEP_DEGREES = 2;
const COARSE_STEP_DEGREES = 15;

const JUMP_KEYS: Record<Stroke, string> = {
  intake: 'controls.jumpToStroke.intake',
  compression: 'controls.jumpToStroke.compression',
  power: 'controls.jumpToStroke.power',
  exhaust: 'controls.jumpToStroke.exhaust',
};

const ANGLE_VALUE_KEYS: Record<Stroke, string> = {
  intake: 'controls.angleValue.intake',
  compression: 'controls.angleValue.compression',
  power: 'controls.angleValue.power',
  exhaust: 'controls.angleValue.exhaust',
};

const STROKE_PHASES: readonly Phase[] = STROKES.map((stroke) => ({
  id: stroke,
  start: STROKE_START[stroke],
  end: STROKE_START[stroke] + STROKE_DEGREES,
  labelKey: STROKE_KEYS[stroke],
  jumpLabelKey: JUMP_KEYS[stroke],
  tone: STROKE_TONES[stroke],
}));

function describeAngle(angle: number): string {
  return t(ANGLE_VALUE_KEYS[strokeAt(angle)], { angle: formatDegrees(angle) });
}

export const ENGINE_TIMELINE: Timeline = {
  cycle: CYCLE_DEGREES,
  step: SCRUBBER_STEP_DEGREES,
  nudge: { fine: FINE_STEP_DEGREES, coarse: COARSE_STEP_DEGREES },
  labelKey: 'controls.crankAngle',
  phasesLabelKey: 'controls.jumpToStrokeGroup',
  formatPhase: formatDegrees,
  describePhase: describeAngle,
  rate: (rpm) => (rpm / SECONDS_PER_MINUTE) * REVOLUTION_DEGREES,
  phases: STROKE_PHASES,
  speed: {
    min: RPM_RANGE.min,
    max: RPM_RANGE.max,
    step: RPM_RANGE.step,
    labelKey: 'controls.speed',
    format: formatRpm,
    describe: describeRpm,
  },
};
