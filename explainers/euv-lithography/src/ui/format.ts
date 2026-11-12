import { formatFixed } from '@core/format';
import { t } from '@core/i18n';

export const WHOLE = 0;
export const TENTHS = 1;
export const HUNDREDTHS = 2;

const PERCENT = 100;
const MM_PER_METRE = 1000;
const ONE_DECIMAL_BELOW_PERCENT = 10;

export function whole(value: number): string {
  return formatFixed(value, WHOLE);
}

export function tenths(value: number): string {
  return formatFixed(value, TENTHS);
}

export function hundredths(value: number): string {
  return formatFixed(value, HUNDREDTHS);
}

export function formatUnit(key: string, value: number, digits = WHOLE): string {
  return t(`units.${key}`, { value: formatFixed(value, digits) });
}

export function formatPercentOf(share: number): string {
  const percent = share * PERCENT;
  const digits = percent !== 0 && percent < ONE_DECIMAL_BELOW_PERCENT ? TENTHS : WHOLE;
  return formatUnit('percent', percent, digits);
}

export function mmOf(metres: number): number {
  return metres * MM_PER_METRE;
}
