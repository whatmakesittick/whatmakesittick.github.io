import { formatFixed, formatNumber } from '@core/format';
import { t } from '@core/i18n';

const METERS_PER_SECOND_GAUGE_DIGITS = 1;
const METERS_PER_SECOND_CHAPTER_DIGITS = 2;
const METERS_DIGITS = 2;

function unit(key: string, value: string): string {
  return t(`units.${key}`, { value });
}

export function formatCount(count: number): string {
  return formatNumber(count);
}

export function formatMetersPerSecond(
  speedMs: number,
  digits = METERS_PER_SECOND_GAUGE_DIGITS,
): string {
  return unit('metersPerSecond', formatFixed(speedMs, digits));
}

export function formatMetersPerSecondDetailed(speedMs: number): string {
  return formatMetersPerSecond(speedMs, METERS_PER_SECOND_CHAPTER_DIGITS);
}

export function formatRate(rate: number): string {
  return formatNumber(Math.round(rate));
}

export function formatPerMinute(rate: number): string {
  return unit('perMinute', formatRate(rate));
}

export function formatLength(meters: number): string {
  return formatFixed(meters, METERS_DIGITS);
}

export function formatMeters(meters: number): string {
  return unit('meters', formatLength(meters));
}

export function formatSpeed(speedMs: number): string {
  return formatFixed(speedMs, METERS_PER_SECOND_CHAPTER_DIGITS);
}

export function formatNewtons(newtons: number): string {
  return unit('newtons', formatNumber(Math.round(newtons)));
}

export function formatWatts(watts: number): string {
  return unit('watts', formatNumber(Math.round(watts)));
}

export function formatDegrees(degrees: number): string {
  return unit('degrees', formatNumber(Math.round(degrees) || 0));
}
