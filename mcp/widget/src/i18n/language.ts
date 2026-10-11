import { resolveLanguage } from '../../../shared/catalogue.ts';
import type { LanguageCode } from '../../../../src/core/i18n/languages.ts';

export interface LanguageSignals {
  readonly input?: string;
  readonly result?: string;
  readonly locale?: string;
}

export const NO_SIGNALS: LanguageSignals = {};

type Obj = Record<string, unknown>;
const isObj = (value: unknown): value is Obj => typeof value === 'object' && value !== null;

function given(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function compact(signals: LanguageSignals): LanguageSignals {
  return Object.fromEntries(
    Object.entries(signals).filter(([, value]) => value !== undefined),
  ) as LanguageSignals;
}

export function languageOf({ input, result, locale }: LanguageSignals): LanguageCode {
  return resolveLanguage(input ?? result ?? locale);
}

export function withInput(signals: LanguageSignals, args: unknown): LanguageSignals {
  return compact({ locale: signals.locale, input: isObj(args) ? given(args.lang) : undefined });
}

export function withResult(signals: LanguageSignals, result: unknown): LanguageSignals {
  const content = isObj(result) ? result.structuredContent : undefined;
  return compact({ ...signals, result: isObj(content) ? given(content.lang) : undefined });
}

export function withContext(signals: LanguageSignals, context: unknown): LanguageSignals {
  const locale = isObj(context) ? given(context.locale) : undefined;
  return locale && locale !== signals.locale ? { ...signals, locale } : signals;
}
