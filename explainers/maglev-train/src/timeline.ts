import type { Phase, Timeline } from '@core/explainer';
import { formatNumber } from '@core/format';
import { t } from '@core/i18n';
import { PHASE_IDS } from './ids';
import type { PhaseId } from './ids';
import { BASE_RIDE_SECONDS, PHASE_RANGES, RUN_UNITS, SPEED_RANGE, phaseAt, rate } from './model';
import { PHASE_TONES } from './theme';

const SCRUBBER_STEP_UNITS = 1;
const FINE_STEP_UNITS = 5;
const COARSE_STEP_UNITS = 50;

function rideSeconds(speed: number): number {
  return Math.round(BASE_RIDE_SECONDS / speed);
}

function stageCount(id: PhaseId): Record<string, string> {
  return {
    step: formatNumber(PHASE_IDS.indexOf(id) + 1),
    total: formatNumber(PHASE_IDS.length),
  };
}

export function formatPhase(units: number): string {
  return t('timeline.value', stageCount(phaseAt(units)));
}

export function describePhase(units: number): string {
  const id = phaseAt(units);
  return t('timeline.during', { ...stageCount(id), detail: t(`timeline.detail.${id}`) });
}

export function formatSpeed(speed: number): string {
  return t('timeline.speedValue', { factor: formatNumber(speed) });
}

export function describeSpeed(speed: number): string {
  return t('timeline.speedDescribe', { seconds: formatNumber(rideSeconds(speed)) });
}

const RUN_PHASES: readonly Phase[] = PHASE_IDS.map((id) => ({
  id,
  ...PHASE_RANGES[id],
  labelKey: `timeline.phase.${id}`,
  jumpLabelKey: `timeline.jump.${id}`,
  tone: PHASE_TONES[id],
}));

export const MAGLEV_TRAIN_TIMELINE: Timeline = {
  cycle: RUN_UNITS,
  loop: false,
  step: SCRUBBER_STEP_UNITS,
  nudge: { fine: FINE_STEP_UNITS, coarse: COARSE_STEP_UNITS },
  labelKey: 'timeline.label',
  phasesLabelKey: 'timeline.phases',
  formatPhase,
  describePhase,
  rate,
  phases: RUN_PHASES,
  speed: {
    min: SPEED_RANGE.min,
    max: SPEED_RANGE.max,
    step: SPEED_RANGE.step,
    labelKey: 'timeline.speed',
    format: formatSpeed,
    describe: describeSpeed,
  },
};
