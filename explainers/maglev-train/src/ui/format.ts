import { formatFixed } from '@core/format';
import { currentLanguage, t } from '@core/i18n';
import type { MotionReading } from '../ids';

export const WHOLE = 0;
export const TENTHS = 1;

const SECONDS_PER_MINUTE = 60;
const CLOCK_DIGITS = 2;
const CLOCK_PAD = '0';
const METRES_PER_KILOMETRE = 1000;
const MILLIMETRES_PER_METRE = 1000;

interface MinutesAndSeconds {
  minutes: number;
  seconds: number;
}

export function whole(value: number): string {
  return formatFixed(value, WHOLE);
}

export function tenths(value: number): string {
  return formatFixed(value, TENTHS);
}

export function toKilometres(metres: number): number {
  return metres / METRES_PER_KILOMETRE;
}

export function toMillimetres(metres: number): number {
  return metres * MILLIMETRES_PER_METRE;
}

export function formatUnit(key: string, value: number, digits = WHOLE): string {
  return t(`units.${key}`, { value: formatFixed(value, digits) });
}

export function formatRange(key: string, min: number, max: number): string {
  return t(`units.${key}`, { min: whole(min), max: whole(max) });
}

export function formatMm(millimetres: number, digits: number): string {
  return formatUnit('mm', millimetres, digits);
}

export function formatKmOf(metres: number, totalMetres: number): string {
  return t('units.kmOf', {
    value: tenths(toKilometres(metres)),
    total: whole(toKilometres(totalMetres)),
  });
}

function splitMinutes(seconds: number): MinutesAndSeconds {
  const total = Math.max(0, Math.round(seconds));
  return {
    minutes: Math.floor(total / SECONDS_PER_MINUTE),
    seconds: total % SECONDS_PER_MINUTE,
  };
}

export function formatClock(seconds: number): string {
  const parts = splitMinutes(seconds);
  return t('units.clock', {
    minutes: whole(parts.minutes),
    seconds: String(parts.seconds).padStart(CLOCK_DIGITS, CLOCK_PAD),
  });
}

export function formatClockOf(elapsedSeconds: number, totalSeconds: number): string {
  return t('units.clockOf', {
    elapsed: formatClock(elapsedSeconds),
    total: formatClock(totalSeconds),
  });
}

export function formatMinutesSeconds(seconds: number): string {
  const parts = splitMinutes(seconds);
  return t('units.minutesSeconds', {
    minutes: whole(parts.minutes),
    seconds: whole(parts.seconds),
  });
}

export function formatGap({ onSkids, gapMm }: Pick<MotionReading, 'onSkids' | 'gapMm'>): string {
  return onSkids ? t('units.onSkids') : formatMm(gapMm, TENTHS);
}

export function formatYear(year: number): string {
  return new Intl.NumberFormat(currentLanguage(), { useGrouping: false }).format(year);
}
