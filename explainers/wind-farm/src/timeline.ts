import type { Phase, Timeline } from '@core/explainer';
import { formatNumber } from '@core/format';
import { t } from '@core/i18n';
import { PHASE_IDS } from './ids';
import type { PhaseId } from './ids';
import { CYCLE_MINUTES, PHASE_RANGES, SPEED_RANGE, clockOf, phaseOf, rate } from './model';
import { PHASE_TONES } from './theme';

const SCRUBBER_STEP_MINUTES = 5;
const FINE_STEP_MINUTES = 15;
const COARSE_STEP_MINUTES = 60;

function phaseKey(id: PhaseId): string {
  return `timeline.phase.${id}`;
}

function jumpKey(id: PhaseId): string {
  return `timeline.jump.${id}`;
}

export function formatPhase(minute: number): string {
  return t('timeline.value', { time: clockOf(minute) });
}

export function describePhase(minute: number): string {
  return t('timeline.during', { time: clockOf(minute), phase: t(phaseKey(phaseOf(minute))) });
}

export function formatSpeed(speed: number): string {
  return t('timeline.speedValue', { value: formatNumber(speed) });
}

export function describeSpeed(speed: number): string {
  return t('timeline.speedFormat', { value: formatNumber(speed) });
}

const DAY_PHASES: readonly Phase[] = PHASE_IDS.map((id) => ({
  id,
  start: PHASE_RANGES[id][0],
  end: PHASE_RANGES[id][1],
  labelKey: phaseKey(id),
  jumpLabelKey: jumpKey(id),
  tone: PHASE_TONES[id],
}));

export const WIND_FARM_TIMELINE: Timeline = {
  cycle: CYCLE_MINUTES,
  loop: true,
  step: SCRUBBER_STEP_MINUTES,
  nudge: { fine: FINE_STEP_MINUTES, coarse: COARSE_STEP_MINUTES },
  labelKey: 'timeline.label',
  phasesLabelKey: 'timeline.phases',
  formatPhase,
  describePhase,
  rate,
  phases: DAY_PHASES,
  speed: {
    min: SPEED_RANGE.min,
    max: SPEED_RANGE.max,
    step: SPEED_RANGE.step,
    labelKey: 'timeline.speed',
    format: formatSpeed,
    describe: describeSpeed,
  },
};
