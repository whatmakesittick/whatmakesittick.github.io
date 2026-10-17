import type { Phase, Timeline } from '@core/explainer';
import { formatFixed, formatNumber } from '@core/format';
import { t } from '@core/i18n';
import { PHASE_IDS } from './ids';
import type { PhaseId } from './ids';
import { PHASE_RANGES, RUN_SECONDS, SPEED_RANGE, phaseAt, rate } from './model';
import { PHASE_TONES } from './theme';

const SCRUBBER_STEP_S = 0.1;
const FINE_STEP_S = 0.5;
const COARSE_STEP_S = 1;
const SECONDS_DIGITS = 1;

function phaseKey(id: PhaseId): string {
  return `timeline.phase.${id}`;
}

function jumpKey(id: PhaseId): string {
  return `timeline.jump.${id}`;
}

function runSeconds(seconds: number): string {
  return formatFixed(seconds, SECONDS_DIGITS);
}

export function formatPhase(seconds: number): string {
  return t('timeline.value', { seconds: runSeconds(seconds) });
}

export function describePhase(seconds: number): string {
  return t('timeline.during', {
    seconds: runSeconds(seconds),
    phase: t(phaseKey(phaseAt(seconds))),
  });
}

export function formatSpeed(speed: number): string {
  return t('timeline.speedValue', { factor: formatNumber(speed) });
}

export function describeSpeed(speed: number): string {
  return t('timeline.speedDescribe', { factor: formatNumber(speed) });
}

const RUN_PHASES: readonly Phase[] = PHASE_IDS.map((id) => ({
  id,
  start: PHASE_RANGES[id].start,
  end: PHASE_RANGES[id].end,
  labelKey: phaseKey(id),
  jumpLabelKey: jumpKey(id),
  tone: PHASE_TONES[id],
}));

export const THRUSTER_CAR_TIMELINE: Timeline = {
  cycle: RUN_SECONDS,
  loop: false,
  step: SCRUBBER_STEP_S,
  nudge: { fine: FINE_STEP_S, coarse: COARSE_STEP_S },
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
