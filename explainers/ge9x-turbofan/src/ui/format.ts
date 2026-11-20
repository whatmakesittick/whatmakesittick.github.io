import { formatFixed, formatNumber } from '@core/format';
import { t } from '@core/i18n';

const METRES_DIGITS = 1;
const PERCENT = 100;

export function formatMetresValue(metres: number): string {
  return formatFixed(metres, METRES_DIGITS);
}

export function formatPercent(share: number): string {
  return t('units.percent', { value: formatNumber(Math.round(share * PERCENT)) });
}

export function formatThrust(share: number): string {
  const percent = Math.round(share * PERCENT);
  if (percent >= 0) return t('units.percent', { value: formatNumber(percent) });
  return t('readouts.reverse', { percent: formatNumber(-percent) });
}

export function formatLever(lever: number): string {
  if (lever <= 0) return t('gauge.idle');
  if (lever >= 1) return t('gauge.takeoff');
  return t('gauge.leverValue', { percent: formatNumber(Math.round(lever * PERCENT)) });
}
