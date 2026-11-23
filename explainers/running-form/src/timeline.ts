import type { Phase, Timeline } from '@core/explainer';
import { formatNumber } from '@core/format';
import { t } from '@core/i18n';
import { PHASE_IDS } from './ids';
import type { PaceId, PhaseId } from './ids';
import { DEFAULT_PACE } from './model/paces';
import { CYCLE_UNITS, REAL_TIME_SPEED, SPEED_RANGE, paceRate, speedFactor } from './model/playback';
import { PHASE_RANGES, phaseAt } from './model/timeMap';
import { PHASE_TONES } from './theme';

export const SCRUBBER_STEP_UNITS = 2;
const FINE_STEP_UNITS = 5;
const COARSE_STEP_UNITS = 50;
const UNITS_PER_PERCENT = CYCLE_UNITS / 100;

export function phaseKey(id: PhaseId): string {
  return `timeline.phase.${id}`;
}

function jumpKey(id: PhaseId): string {
  return `timeline.jump.${id}`;
}

function percentText(units: number): string {
  return formatNumber(Math.round(units / UNITS_PER_PERCENT));
}

export function formatPlaybackSpeed(speed: number): string {
  return t('timeline.speedValue', { factor: formatNumber(speedFactor(speed)) });
}

export function describeSpeed(speed: number): string {
  if (speed === REAL_TIME_SPEED) return t('timeline.realTime');
  return t('timeline.slower', { factor: formatNumber(1 / speedFactor(speed)) });
}

export function formatPhase(units: number): string {
  return t('timeline.value', { percent: percentText(units) });
}

export function describeRunPhase(units: number, pace: PaceId): string {
  const phase = t(phaseKey(phaseAt(units, pace)));
  return t('timeline.during', { percent: percentText(units), phase });
}

const RUN_PHASES: readonly Phase[] = PHASE_IDS.map((id) => ({
  id,
  start: PHASE_RANGES[id].start,
  end: PHASE_RANGES[id].end,
  labelKey: phaseKey(id),
  jumpLabelKey: jumpKey(id),
  tone: PHASE_TONES[id],
}));

export function createRunTimeline(getPace: () => PaceId, getStepRate: () => number): Timeline {
  return {
    cycle: CYCLE_UNITS,
    loop: true,
    step: SCRUBBER_STEP_UNITS,
    nudge: { fine: FINE_STEP_UNITS, coarse: COARSE_STEP_UNITS },
    labelKey: 'timeline.label',
    phasesLabelKey: 'timeline.phases',
    formatPhase,
    describePhase: (units) => describeRunPhase(units, getPace()),
    formatInputs: () => [getPace(), getStepRate()],
    rate: (speed) => paceRate(getPace(), getStepRate(), speed),
    phases: RUN_PHASES,
    speed: {
      min: SPEED_RANGE.min,
      max: SPEED_RANGE.max,
      step: SPEED_RANGE.step,
      labelKey: 'timeline.speed',
      format: formatPlaybackSpeed,
      describe: describeSpeed,
    },
  };
}

export const RUN_TIMELINE_BASE: Timeline = createRunTimeline(
  () => DEFAULT_PACE,
  () => 0,
);
