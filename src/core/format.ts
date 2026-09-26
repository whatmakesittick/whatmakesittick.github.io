import { currentLanguage } from './i18n';

const numberFormats = new Map<string, Intl.NumberFormat>();

function numberFormat(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const language = currentLanguage();
  const cacheKey = `${language}:${JSON.stringify(options)}`;
  const cached = numberFormats.get(cacheKey);
  if (cached) return cached;
  const format = new Intl.NumberFormat(language, { signDisplay: 'negative', ...options });
  numberFormats.set(cacheKey, format);
  return format;
}

export function formatNumber(value: number): string {
  return numberFormat({}).format(value);
}

export function formatFixed(value: number, fractionDigits: number): string {
  return numberFormat({
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
