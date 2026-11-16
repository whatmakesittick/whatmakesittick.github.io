import { formatFixed, formatNumber, formatSignificant } from '@core/format';
import { t } from '@core/i18n';
import type { PhaseId } from '../ids';
import {
  BISULFITE_START_M,
  LIFETIME_SURVIVES_S,
  bisulfiteRatio,
  paceAt,
  phaseIdAt,
  toMillimolar,
  toMolar,
  unitsAt,
} from '../model';
import { speedFactor } from '../model/playback';

const MILLIMOLAR_DIGITS = 2;
const SLIDER_MILLIMOLAR_DIGITS = 1;
const SWITCH_DIGITS = 1;
const RATIO_DIGITS = 2;
const LIFETIME_DIGITS = 2;
const PERCENT = 100;
const MICROMOLAR_PER_MILLIMOLAR = 1000;
const SMALLEST_SHOWN_MICROMOLAR = 1;
const ONE_MILLIMOLAR_M = 1e-3;
const NANOSECONDS_PER_SECOND = 1e9;
const MICROSECONDS_PER_SECOND = 1e6;
const MILLISECONDS_PER_SECOND = 1e3;
const ONE_MICROSECOND_S = 1e-6;
const ONE_MILLISECOND_S = 1e-3;
const REAL_PACE = 1;

export const CLOCK_DIGITS: Readonly<Record<PhaseId, number>> = {
  pour: 1,
  induction: 1,
  exhaustion: 2,
  iodine: 3,
  complex: 3,
  blue: 1,
};

function unit(key: string, value: string): string {
  return t(`units.${key}`, { value });
}

export function formatClockSeconds(seconds: number, switchAt: number): string {
  return formatFixed(seconds, CLOCK_DIGITS[phaseIdAt(unitsAt(seconds, switchAt))]);
}

export function formatClock(seconds: number, switchAt: number): string {
  return t('timeline.value', { seconds: formatClockSeconds(seconds, switchAt) });
}

export function formatSwitchSeconds(switchAt: number): string {
  return formatFixed(switchAt, SWITCH_DIGITS);
}

export function formatSwitch(switchAt: number): string {
  return t('timeline.value', { seconds: formatSwitchSeconds(switchAt) });
}

export function formatMillimolar(molar: number, digits = MILLIMOLAR_DIGITS): string {
  return unit('millimolar', formatFixed(toMillimolar(molar), digits));
}

export function formatIodateSetting(millimolar: number): string {
  return unit('millimolar', formatFixed(millimolar, SLIDER_MILLIMOLAR_DIGITS));
}

export function formatTemperature(celsius: number): string {
  return unit('celsius', formatNumber(celsius));
}

export function formatIodine(iodineM: number, seconds: number, switchAt: number): string {
  const micromolar = Math.round(toMillimolar(iodineM) * MICROMOLAR_PER_MILLIMOLAR);
  if (seconds < switchAt || micromolar < SMALLEST_SHOWN_MICROMOLAR) {
    return t('readouts.iodineState.eaten');
  }
  if (iodineM < ONE_MILLIMOLAR_M) return unit('micromolar', formatNumber(micromolar));
  return formatMillimolar(iodineM);
}

function significant(value: number): string {
  return formatSignificant(value, LIFETIME_DIGITS);
}

export function formatLifetime(lifetimeSeconds: number): string {
  if (!Number.isFinite(lifetimeSeconds) || lifetimeSeconds > LIFETIME_SURVIVES_S) {
    return t('chapters.invisibleIodine.survives');
  }
  if (lifetimeSeconds < ONE_MICROSECOND_S) {
    return unit('nanoseconds', significant(lifetimeSeconds * NANOSECONDS_PER_SECOND));
  }
  if (lifetimeSeconds < ONE_MILLISECOND_S) {
    return unit('microseconds', significant(lifetimeSeconds * MICROSECONDS_PER_SECOND));
  }
  return unit('milliseconds', significant(lifetimeSeconds * MILLISECONDS_PER_SECOND));
}

export function paceFactor(units: number, switchAt: number, speed: number): number {
  return 1 / (paceAt(units, switchAt) * speedFactor(speed));
}

export function formatPace(units: number, switchAt: number, speed: number): string {
  const slower = paceFactor(units, switchAt, speed);
  const rounded = Math.round(slower);
  if (rounded > REAL_PACE) return t('readouts.pace.slower', { factor: formatNumber(rounded) });
  const faster = Math.round(1 / slower);
  if (faster > REAL_PACE) return t('readouts.pace.faster', { factor: formatNumber(faster) });
  return t('readouts.pace.real');
}

export function formatPercent(share: number): string {
  return unit('percent', formatNumber(Math.round(share * PERCENT)));
}

export function formatRatio(iodateMm: number): string {
  return t('chapters.tuning.ratioValue', {
    ratio: formatFixed(bisulfiteRatio(toMolar(iodateMm)), RATIO_DIGITS),
  });
}

export function bisulfiteShare(bisulfiteM: number): number {
  return bisulfiteM / BISULFITE_START_M;
}
