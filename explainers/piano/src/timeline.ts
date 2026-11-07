import type { Phase, Timeline } from '@core/explainer';
import { formatNumber } from '@core/format';
import { t } from '@core/i18n';
import { PHASE_IDS } from './ids';
import type { PhaseId } from './ids';
import {
  CYCLE_UNITS,
  PHASE_RANGES,
  REAL_RING_SPEED,
  SPEED_RANGE,
  loopSeconds,
  phaseAt,
  rate,
} from './model';
import { PHASE_TONES } from './theme';

const SCRUBBER_STEP_UNITS = 1;
const FINE_STEP_UNITS = 5;
const COARSE_STEP_UNITS = 50;

function stepCount(id: PhaseId): Record<string, string> {
  return {
    step: formatNumber(PHASE_IDS.indexOf(id) + 1),
    total: formatNumber(PHASE_IDS.length),
  };
}

function strokeSeconds(speed: number): Record<string, string> {
  return { seconds: formatNumber(loopSeconds(speed)) };
}

export function formatPhase(units: number): string {
  return t('timeline.value', stepCount(phaseAt(units)));
}

export function describePhase(units: number): string {
  const id = phaseAt(units);
  return t('timeline.during', { ...stepCount(id), detail: t(`timeline.detail.${id}`) });
}

export function formatSpeed(speed: number): string {
  return t('timeline.speedValue', strokeSeconds(speed));
}

export function describeSpeed(speed: number): string {
  const key = speed === REAL_RING_SPEED ? 'timeline.speedDescribeReal' : 'timeline.speedDescribe';
  return t(key, strokeSeconds(speed));
}

const STROKE_PHASES: readonly Phase[] = PHASE_IDS.map((id) => ({
  id,
  ...PHASE_RANGES[id],
  labelKey: `timeline.phase.${id}`,
  jumpLabelKey: `timeline.jump.${id}`,
  tone: PHASE_TONES[id],
}));

export const PIANO_TIMELINE: Timeline = {
  cycle: CYCLE_UNITS,
  step: SCRUBBER_STEP_UNITS,
  nudge: { fine: FINE_STEP_UNITS, coarse: COARSE_STEP_UNITS },
  labelKey: 'timeline.label',
  phasesLabelKey: 'timeline.phases',
  formatPhase,
  describePhase,
  rate,
  phases: STROKE_PHASES,
  speed: {
    min: SPEED_RANGE.min,
    max: SPEED_RANGE.max,
    step: SPEED_RANGE.step,
    labelKey: 'timeline.speed',
    format: formatSpeed,
    describe: describeSpeed,
  },
};
