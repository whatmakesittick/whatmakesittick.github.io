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

export function formatPerMinute(rate: number): string {
  return unit('perMinute', formatNumber(Math.round(rate)));
}

export function formatMeters(meters: number): string {
  return unit('meters', formatFixed(meters, METERS_DIGITS));
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
