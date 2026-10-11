import en from '../locales/en.json';
import { DEFAULT_LANGUAGE } from './languages';
import { loadersByLanguage } from './loader';
import type { Dictionary, LocaleLoaders } from './resources';

export const CORE_LOCALES: LocaleLoaders = {
  ...loadersByLanguage(
    import.meta.glob<Dictionary>(['../locales/*.json', '!../locales/en.json'], {
      import: 'default',
    }),
  ),
  [DEFAULT_LANGUAGE]: () => Promise.resolve(en),
};
