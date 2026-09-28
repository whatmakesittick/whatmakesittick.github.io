import { formatFixed, formatNumber, formatSigned } from '@core/format';
import { t } from '@core/i18n';
import type { LayerId, PhaseId } from '../ids';
import {
  DAY_CYCLE_MIN,
  WH_PER_KWH,
  bandOf,
  clockParts,
  minuteOfDay,
  passesThrough,
  phaseAt,
} from '../model';

export const NO_VALUE = '–';

const CLOCK_DIGITS = 2;
const CLOCK_PAD = '0';
const PERCENT = 100;
const MICROMETRES_PER_MM = 1000;
const TENS = 10;
const SCIENTIFIC_SEPARATOR = ' × 10';
const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const SUPERSCRIPT_MINUS = '⁻';
const DEPTH_DIGITS: readonly (readonly [below: number, digits: number])[] = [
  [0.1, 3],
  [1, 2],
  [10, 1],
];

export const PHASE_KEYS: Record<PhaseId, string> = {
  dawn: 'timeline.phase.dawn',
  morning: 'timeline.phase.morning',
  noon: 'timeline.phase.noon',
  afternoon: 'timeline.phase.afternoon',
  dusk: 'timeline.phase.dusk',
};

export const JUMP_KEYS: Record<PhaseId, string> = {
  dawn: 'timeline.jump.dawn',
  morning: 'timeline.jump.morning',
  noon: 'timeline.jump.noon',
  afternoon: 'timeline.jump.afternoon',
  dusk: 'timeline.jump.dusk',
};

const DURING_KEYS: Record<PhaseId, string> = {
  dawn: 'timeline.during.dawn',
  morning: 'timeline.during.morning',
  noon: 'timeline.during.noon',
  afternoon: 'timeline.during.afternoon',
  dusk: 'timeline.during.dusk',
};

function twoDigits(value: number): string {
  return String(value).padStart(CLOCK_DIGITS, CLOCK_PAD);
}

export function formatPhase(phase: number): string {
  const { hours, minutes } = clockParts(minuteOfDay(phase));
  return `${twoDigits(hours)}:${twoDigits(minutes)}`;
}

export function describePhase(phase: number): string {
  return t('timeline.value', { time: formatPhase(phase), phase: t(DURING_KEYS[phaseAt(phase)]) });
}

export function formatSpeed(minutesPerSecond: number): string {
  return t('timeline.speedValue', { minutes: formatNumber(minutesPerSecond) });
}

export function describeSpeed(minutesPerSecond: number): string {
  return t('timeline.speedDescription', {
    minutes: formatNumber(minutesPerSecond),
    seconds: formatNumber(Math.round(DAY_CYCLE_MIN / minutesPerSecond)),
  });
}

export function formatDegrees(degrees: number): string {
  return t('units.degrees', { value: formatFixed(degrees, 0) });
}

export function formatSunElevation(degrees: number): string {
  return degrees > 0 ? t('readouts.sunValue', { value: formatDegrees(degrees) }) : NO_VALUE;
}

export function formatIrradiance(wattsPerSquareMetre: number): string {
  return t('units.wattsPerSquareMetre', { value: formatFixed(wattsPerSquareMetre, 0) });
}

export function formatWatts(watts: number): string {
  return t('units.watts', { value: formatFixed(watts, 0) });
}

export function formatKilowattHours(wattHours: number): string {
  return t('units.kilowattHours', { value: formatFixed(wattHours / WH_PER_KWH, 2) });
}

export function formatEnergyToday(wattHours: number): string {
  return t('readouts.energyValue', { value: formatKilowattHours(wattHours) });
}

export function formatCelsius(celsius: number): string {
  return t('units.celsius', { value: formatFixed(celsius, 0) });
}

export function formatPercent(share: number, digits = 0): string {
  return t('units.percent', { value: formatFixed(share * PERCENT, digits) });
}

export function formatSignedPercent(share: number, digits = 1): string {
  return t('units.percent', { value: formatSigned(share * PERCENT, digits) });
}

export function formatVolts(volts: number): string {
  return t('units.volts', { value: formatFixed(volts, 1) });
}

export function formatAxisVolts(volts: number): string {
  return t('units.volts', { value: formatNumber(volts) });
}

export function formatAxisAmps(amps: number): string {
  return t('units.amps', { value: formatNumber(amps) });
}

export function formatNanometres(nanometres: number): string {
  return t('units.nm', { value: formatNumber(nanometres) });
}

export function formatElectronVolts(electronVolts: number): string {
  return t('units.ev', { value: formatFixed(electronVolts, 2) });
}

function depthDigits(micrometres: number): number {
  return DEPTH_DIGITS.find(([below]) => micrometres < below)?.[1] ?? 0;
}

export function formatDepth(micrometres: number): string {
  if (micrometres >= MICROMETRES_PER_MM) {
    return t('units.mm', { value: formatFixed(micrometres / MICROMETRES_PER_MM, 1) });
  }
  return t('units.um', { value: formatFixed(micrometres, depthDigits(micrometres)) });
}

export function formatAbsorption(wavelengthNm: number, depthUm: number): string {
  return passesThrough(wavelengthNm) ? t('units.passes') : formatDepth(depthUm);
}

export function formatHeat(wavelengthNm: number, excessEv: number): string {
  return passesThrough(wavelengthNm) ? NO_VALUE : formatElectronVolts(excessEv);
}

export function formatBand(wavelengthNm: number): string {
  return t(`bands.${bandOf(wavelengthNm)}`);
}

export function formatThickness(millimetres: number | null): string {
  return millimetres === null ? NO_VALUE : t('units.mm', { value: formatNumber(millimetres) });
}

export function formatLayerMaterial(layer: LayerId): string {
  return t(`layers.material.${layer}`);
}

export function formatLayerJob(layer: LayerId): string {
  return t(`layers.job.${layer}`);
}

export function formatCount(count: number): string {
  return formatNumber(count);
}

export function formatShadedCells(count: number, total: number): string {
  return t('sections.wiring.cellsValue', {
    count: formatNumber(count),
    total: formatNumber(total),
  });
}

export function formatWorkingDiodes(count: number, total: number): string {
  return t('sections.wiring.diodesValue', {
    count: formatNumber(count),
    total: formatNumber(total),
  });
}

function superscript(exponent: number): string {
  const digits = [...String(Math.abs(exponent))].map((digit) => SUPERSCRIPT_DIGITS[Number(digit)]);
  return `${exponent < 0 ? SUPERSCRIPT_MINUS : ''}${digits.join('')}`;
}

export function formatScientific(value: number): string {
  if (value <= 0) return formatNumber(0);
  let exponent = Math.floor(Math.log10(value));
  let mantissa = Math.round((value / TENS ** exponent) * TENS) / TENS;
  if (mantissa >= TENS) {
    mantissa /= TENS;
    exponent += 1;
  }
  return `${formatFixed(mantissa, 1)}${SCIENTIFIC_SEPARATOR}${superscript(exponent)}`;
}
