import { formatFixed, formatSignificant } from '@core/format';
import { currentLanguage, t } from '@core/i18n';
import type { BenchmarkId, MediumId } from '../ids';
import { PUE } from '../model';

export const WHOLE = 0;
export const TENTHS = 1;
export const HUNDREDTHS = 2;

const PERCENT = 100;

export function whole(value: number): string {
  return formatFixed(value, WHOLE);
}

export function tenths(value: number): string {
  return formatFixed(value, TENTHS);
}

export function hundredths(value: number): string {
  return formatFixed(value, HUNDREDTHS);
}

export function significant(value: number, digits: number): string {
  return formatSignificant(value, digits);
}

export function percentOf(share: number): string {
  return whole(share * PERCENT);
}

export function formatUnit(key: string, value: number, digits = WHOLE): string {
  return t(`units.${key}`, { value: formatFixed(value, digits) });
}

export function formatMedium(medium: MediumId): string {
  return t(`units.medium.${medium}`);
}

export function formatCelsiusOf(celsius: number, medium: MediumId): string {
  return t('units.celsiusOf', { value: tenths(celsius), medium: formatMedium(medium) });
}

export function formatPue(benchmark: BenchmarkId): string {
  return t('units.pueOf', {
    value: hundredths(PUE[benchmark]),
    site: t(`readouts.pueSite.${benchmark}`),
  });
}

export function formatYear(year: number): string {
  return new Intl.NumberFormat(currentLanguage(), { useGrouping: false }).format(year);
}
