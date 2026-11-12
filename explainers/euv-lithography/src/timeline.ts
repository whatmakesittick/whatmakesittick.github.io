import type { Phase, Timeline } from '@core/explainer';
import { formatFixed, formatNumber } from '@core/format';
import { t } from '@core/i18n';
import { PHASE_IDS } from './ids';
import type { MachineId, PhaseId } from './ids';
import {
  BASE_RUN_SECONDS,
  PHASE_RANGES,
  RUN_UNITS,
  SCAN_START_UNITS,
  SPEED_RANGE,
  phaseAt,
  rate,
  realSecondsAt,
  scanShareAt,
} from './model';
import { PHASE_TONES } from './theme';

interface ClockUnit {
  key: string;
  below: number;
  perSecond: number;
  digits(value: number): number;
}

const SCRUBBER_STEP_UNITS = 1;
const FINE_STEP_UNITS = 5;
const COARSE_STEP_UNITS = 50;
const ONE_DECIMAL_BELOW = 10;

export const DEFAULT_CLOCK_MACHINE: MachineId = 'nxe3600d';
const PERCENT = 100;

function wholeDigits(): number {
  return 0;
}

function tenthsBelowTen(value: number): number {
  return value < ONE_DECIMAL_BELOW ? 1 : 0;
}

function twoDecimalsBelowOne(value: number): number {
  return value < 1 ? 2 : 1;
}

const CLOCK_UNITS: readonly ClockUnit[] = [
  { key: 'units.ns', below: 1e-6, perSecond: 1e9, digits: wholeDigits },
  { key: 'units.us', below: 1e-3, perSecond: 1e6, digits: tenthsBelowTen },
  { key: 'units.ms', below: 0.1, perSecond: 1e3, digits: tenthsBelowTen },
  { key: 'units.s', below: Number.POSITIVE_INFINITY, perSecond: 1, digits: twoDecimalsBelowOne },
];

export function formatElapsed(seconds: number): string {
  const size = Math.abs(seconds);
  const unit = CLOCK_UNITS.find(({ below }) => size < below) ?? CLOCK_UNITS[CLOCK_UNITS.length - 1];
  const scaled = size * unit.perSecond;
  return t(unit.key, { value: formatFixed(scaled, unit.digits(scaled)) });
}

export function formatClock(seconds: number): string {
  const key = seconds < 0 ? 'clock.before' : 'clock.after';
  return t(key, { value: formatElapsed(seconds) });
}

function clockAt(units: number): string {
  if (units <= SCAN_START_UNITS) return formatClock(realSecondsAt(units, DEFAULT_CLOCK_MACHINE));
  return t('clock.scan', {
    value: t('units.percent', { value: formatFixed(scanShareAt(units) * PERCENT, 0) }),
  });
}

function runSeconds(speed: number): number {
  return Math.round(BASE_RUN_SECONDS / speed);
}

function stageCount(id: PhaseId): Record<string, string> {
  return {
    step: formatNumber(PHASE_IDS.indexOf(id) + 1),
    total: formatNumber(PHASE_IDS.length),
  };
}

export function formatPhase(units: number): string {
  return t('timeline.value', { time: clockAt(units) });
}

export function describePhase(units: number): string {
  const id = phaseAt(units);
  return t('timeline.during', {
    ...stageCount(id),
    detail: t(`timeline.detail.${id}`),
    time: clockAt(units),
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

export const EUV_TIMELINE: Timeline = {
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
