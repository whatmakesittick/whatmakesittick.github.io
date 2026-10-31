import type { Phase, Timeline } from '@core/explainer';
import { formatFixed, formatNumber } from '@core/format';
import { t } from '@core/i18n';
import { PHASE_IDS } from './ids';
import type { PhaseId } from './ids';
import {
  BASE_RUN_SECONDS,
  PHASE_RANGES,
  RUN_UNITS,
  SPEED_RANGE,
  phaseAt,
  rate,
  realSecondsAt,
} from './model';
import { PHASE_TONES } from './theme';

interface ElapsedUnit {
  key: string;
  below: number;
  perSecond: number;
  format(value: number): string;
}

const SCRUBBER_STEP_UNITS = 1;
const FINE_STEP_UNITS = 5;
const COARSE_STEP_UNITS = 50;

const ONE_DECIMAL_BELOW = 10;

function runSeconds(speed: number): number {
  return Math.round(BASE_RUN_SECONDS / speed);
}

function wholeValue(value: number): string {
  return formatNumber(Math.round(value));
}

function decimalValue(value: number): string {
  return value < ONE_DECIMAL_BELOW ? formatFixed(value, 1) : wholeValue(value);
}

const ELAPSED_UNITS: readonly ElapsedUnit[] = [
  { key: 'units.ns', below: 1e-6, perSecond: 1e9, format: wholeValue },
  { key: 'units.us', below: 1e-3, perSecond: 1e6, format: decimalValue },
  { key: 'units.ms', below: 1, perSecond: 1e3, format: decimalValue },
];

const SECONDS: ElapsedUnit = {
  key: 'units.s',
  below: Number.POSITIVE_INFINITY,
  perSecond: 1,
  format: wholeValue,
};

export function formatElapsed(seconds: number): string {
  const unit = ELAPSED_UNITS.find(({ below }) => seconds < below) ?? SECONDS;
  return t(unit.key, { value: unit.format(seconds * unit.perSecond) });
}

function elapsedAt(units: number): string {
  return formatElapsed(realSecondsAt(units));
}

function stageCount(id: PhaseId): Record<string, string> {
  return {
    step: formatNumber(PHASE_IDS.indexOf(id) + 1),
    total: formatNumber(PHASE_IDS.length),
  };
}

export function formatPhase(units: number): string {
  return t('timeline.value', { time: elapsedAt(units) });
}

export function describePhase(units: number): string {
  const id = phaseAt(units);
  return t('timeline.during', {
    ...stageCount(id),
    detail: t(`timeline.detail.${id}`),
    time: elapsedAt(units),
  });
}

export function formatSpeed(speed: number): string {
  return t('timeline.speedValue', { factor: formatNumber(speed) });
}

export function describeSpeed(speed: number): string {
  return t('timeline.speedDescribe', { seconds: formatNumber(runSeconds(speed)) });
}

const RUN_PHASES: readonly Phase[] = PHASE_IDS.map((id) => ({
  id,
  ...PHASE_RANGES[id],
  labelKey: `timeline.phase.${id}`,
  jumpLabelKey: `timeline.jump.${id}`,
  tone: PHASE_TONES[id],
}));

export const DATA_CENTER_TIMELINE: Timeline = {
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
