import type { Phase, Timeline } from '@core/explainer';
import { formatNumber } from '@core/format';
import { t } from '@core/i18n';
import { PHASE_IDS } from './ids';
import type { PhaseId } from './ids';
import { CYCLE_UNITS, PHASE_RANGES, phaseIdAt, secondsAt } from './model/timeMap';
import { REAL_TIME_SPEED, SPEED_RANGE, nominalRate, speedFactor } from './model/playback';
import { PHASE_TONES } from './theme';
import { formatSecondsValue } from './ui/format';

const SCRUBBER_STEP_UNITS = 1;
const FINE_STEP_UNITS = 5;
const COARSE_STEP_UNITS = 50;

export function phaseKey(id: PhaseId): string {
  return `timeline.phase.${id}`;
}

function jumpKey(id: PhaseId): string {
  return `timeline.jump.${id}`;
}

function factorText(factor: number): string {
  return formatNumber(factor);
}

export function formatSpeed(speed: number): string {
  return t('timeline.speedValue', { factor: factorText(speedFactor(speed)) });
}

export function describeSpeed(speed: number): string {
  if (speed === REAL_TIME_SPEED) return t('timeline.realTime');
  const factor = speedFactor(speed);
  if (factor < 1) return t('timeline.slower', { factor: factorText(1 / factor) });
  return t('timeline.faster', { factor: factorText(factor) });
}

export function formatBitePhase(units: number): string {
  return t('timeline.value', { seconds: formatSecondsValue(secondsAt(units)) });
}

export function describeBitePhase(units: number): string {
  const seconds = secondsAt(units);
  const phase = t(phaseKey(phaseIdAt(units)));
  if (seconds < 0) return t('timeline.before', { seconds: formatSecondsValue(-seconds), phase });
  return t('timeline.during', { seconds: formatSecondsValue(seconds), phase });
}

const BITE_PHASES: readonly Phase[] = PHASE_IDS.map((id) => ({
  id,
  start: PHASE_RANGES[id].start,
  end: PHASE_RANGES[id].end,
  labelKey: phaseKey(id),
  jumpLabelKey: jumpKey(id),
  tone: PHASE_TONES[id],
}));

export const BITE_TIMELINE: Timeline = {
  cycle: CYCLE_UNITS,
  loop: false,
  step: SCRUBBER_STEP_UNITS,
  nudge: { fine: FINE_STEP_UNITS, coarse: COARSE_STEP_UNITS },
  labelKey: 'timeline.label',
  phasesLabelKey: 'timeline.phases',
  formatPhase: formatBitePhase,
  describePhase: describeBitePhase,
  rate: nominalRate,
  phases: BITE_PHASES,
  speed: {
    min: SPEED_RANGE.min,
    max: SPEED_RANGE.max,
    step: SPEED_RANGE.step,
    labelKey: 'timeline.speed',
    format: formatSpeed,
    describe: describeSpeed,
  },
};
