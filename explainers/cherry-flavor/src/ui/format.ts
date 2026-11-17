import { formatFixed, formatNumber } from '@core/format';
import { t } from '@core/i18n';

const SECONDS_DIGITS = 1;
const PERCENT = 100;
const HYPHEN_MINUS = /-/g;
const MINUS_SIGN = '−';

export function withMinus(text: string): string {
  return text.replace(HYPHEN_MINUS, MINUS_SIGN);
}

function unit(key: string, value: string): string {
  return t(`units.${key}`, { value });
}

export function formatSecondsValue(seconds: number): string {
  return withMinus(formatFixed(seconds, SECONDS_DIGITS));
}

export function formatSeconds(seconds: number): string {
  return t('timeline.value', { seconds: formatSecondsValue(seconds) });
}

export function formatCelsius(celsius: number): string {
  return unit('celsius', withMinus(formatNumber(Math.round(celsius) || 0)));
}

export function formatPercent(share: number): string {
  return unit('percent', formatNumber(Math.round(share * PERCENT)));
}

export function formatPercentSetting(percent: number): string {
  return unit('percent', formatNumber(percent));
}

export function formatCount(count: number): string {
  return formatNumber(count);
}
