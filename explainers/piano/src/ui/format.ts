import { formatFixed } from '@core/format';
import { t } from '@core/i18n';
import type { ActionPose } from '../ids';
import { MS_PER_SECOND, toSeconds } from '../model';

export const WHOLE = 0;
export const TENTHS = 1;
export const HUNDREDTHS = 2;

const WHOLE_HZ_FROM = 1000;

export function whole(value: number): string {
  return formatFixed(value, WHOLE);
}

export function tenths(value: number): string {
  return formatFixed(value, TENTHS);
}

export function hundredths(value: number): string {
  return formatFixed(value, HUNDREDTHS);
}

export function hertz(hz: number): string {
  return formatFixed(hz, hz < WHOLE_HZ_FROM ? TENTHS : WHOLE);
}

export function formatUnit(key: string, value: number, digits = WHOLE): string {
  return t(`units.${key}`, { value: formatFixed(value, digits) });
}

export function formatRange(key: string, min: number, max: number): string {
  return t(`units.${key}`, { min: whole(min), max: whole(max) });
}

export function formatMm(millimetres: number, digits = TENTHS): string {
  return formatUnit('mm', millimetres, digits);
}

export function formatRealTime(ms: number): string {
  if (ms < MS_PER_SECOND) return formatUnit('millis', ms, TENTHS);
  return formatUnit('seconds', toSeconds(ms), HUNDREDTHS);
}

export function formatHammerGap({
  contact,
  hammerToStringMm,
}: Pick<ActionPose, 'contact' | 'hammerToStringMm'>): string {
  return contact ? t('units.onString') : formatMm(hammerToStringMm);
}

export function formatHammerSpeed(speedMs: number): string {
  return formatUnit('metresPerSecond', Math.abs(speedMs), TENTHS);
}

export function formatLevel(levelDb: number | null): string {
  return levelDb === null ? t('units.silent') : formatUnit('db', levelDb);
}
