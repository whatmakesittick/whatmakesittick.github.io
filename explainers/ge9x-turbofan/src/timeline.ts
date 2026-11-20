import type { Phase, Timeline } from '@core/explainer';
import { formatNumber } from '@core/format';
import { t } from '@core/i18n';
import { PHASE_IDS } from './ids';
import type { PhaseId } from './ids';
import { CYCLE_UNITS, PHASE_RANGES, SPEED_RANGE, metresAt, phaseIdAt, rate } from './model';
import { PHASE_TONES } from './theme';
import { formatMetresValue } from './ui/format';

const SCRUBBER_STEP_UNITS = 1;
const FINE_STEP_UNITS = 5;
const COARSE_STEP_UNITS = 50;

export function phaseKey(id: PhaseId): string {
  return `timeline.phase.${id}`;
}

function jumpKey(id: PhaseId): string {
  return `timeline.jump.${id}`;
}

export function formatSpeed(speed: number): string {
  return t('timeline.speedValue', { factor: formatNumber(speed) });
}

export function describeSpeed(speed: number): string {
  if (speed === SPEED_RANGE.default) return t('timeline.realTime');
  if (speed < SPEED_RANGE.default) {
    return t('timeline.slower', { factor: formatNumber(SPEED_RANGE.default / speed) });
  }
  return t('timeline.faster', { factor: formatNumber(speed / SPEED_RANGE.default) });
}

export function formatAirPosition(units: number): string {
  return t('timeline.value', { metres: formatMetresValue(metresAt(units)) });
}

export function describeAirPosition(units: number): string {
  return t('timeline.describe', {
    metres: formatMetresValue(metresAt(units)),
    phase: t(phaseKey(phaseIdAt(units))),
  });
}

const AIR_PHASES: readonly Phase[] = PHASE_IDS.map((id) => ({
  id,
  start: PHASE_RANGES[id].start,
  end: PHASE_RANGES[id].end,
  labelKey: phaseKey(id),
  jumpLabelKey: jumpKey(id),
  tone: PHASE_TONES[id],
}));

export const AIR_TIMELINE: Timeline = {
  cycle: CYCLE_UNITS,
  loop: true,
  step: SCRUBBER_STEP_UNITS,
  nudge: { fine: FINE_STEP_UNITS, coarse: COARSE_STEP_UNITS },
  labelKey: 'timeline.label',
  phasesLabelKey: 'timeline.phases',
  formatPhase: formatAirPosition,
  describePhase: describeAirPosition,
  rate,
  phases: AIR_PHASES,
  speed: {
    min: SPEED_RANGE.min,
    max: SPEED_RANGE.max,
    step: SPEED_RANGE.step,
    labelKey: 'timeline.speed',
    format: formatSpeed,
    describe: describeSpeed,
  },
};
