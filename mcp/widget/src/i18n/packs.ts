import type { WidgetCatalogue } from '../../../shared/catalogue.ts';
import { DEFAULT_LANGUAGE, type LanguageCode } from '../../../../src/core/i18n/languages.ts';
import type { Catalogues } from '../catalogue.ts';
import { resolveStrings, type Strings, type WidgetStrings } from './strings.ts';

export interface LanguageData {
  core: object;
  widget: WidgetStrings;
}

export type LanguageSources = Partial<Record<LanguageCode, () => Promise<LanguageData>>>;

export type FreshLanguage = (lang: LanguageCode) => Promise<LanguageData>;

export interface LanguagePack {
  lang: LanguageCode;
  catalogue: WidgetCatalogue;
  strings: Strings;
}

export interface Packs {
  englishStrings: Strings;
  ready(lang: LanguageCode): LanguagePack | undefined;
  load(lang: LanguageCode): Promise<LanguagePack>;
  refresh(lang: LanguageCode, force?: boolean): Promise<LanguagePack | undefined>;
}

export function createPacks(
  catalogues: Catalogues,
  sources: LanguageSources,
  fresh?: FreshLanguage,
): Packs {
  const englishStrings = resolveStrings();
  const strings = new Map<LanguageCode, Strings>([[DEFAULT_LANGUAGE, englishStrings]]);
  const pendingStrings = new Map<LanguageCode, Promise<Strings>>();
  const packs = new Map<LanguageCode, LanguagePack>();

  const supported = (lang: LanguageCode): LanguageCode =>
    lang === DEFAULT_LANGUAGE || sources[lang] ? lang : DEFAULT_LANGUAGE;

  const loadStrings = (lang: LanguageCode): Promise<Strings> => {
    const done = strings.get(lang);
    if (done) return Promise.resolve(done);
    let promise = pendingStrings.get(lang);
    if (!promise) {
      const source = sources[lang] as () => Promise<LanguageData>;
      const data = fresh
        ? source().catch((error: unknown) => {
            console.warn('[wmit-widget] language chunk failed, loading a fresh module', error);
            return fresh(lang);
          })
        : source();
      promise = data.then(({ core, widget }) => {
        const resolved = resolveStrings(widget, core);
        strings.set(lang, resolved);
        return resolved;
      });
      promise.then(
        () => pendingStrings.delete(lang),
        () => pendingStrings.delete(lang),
      );
      pendingStrings.set(lang, promise);
    }
    return promise;
  };

  const ready = (wanted: LanguageCode): LanguagePack | undefined => {
    const lang = supported(wanted);
    const text = strings.get(lang);
    const catalogue = catalogues.ready(lang);
    if (!text || !catalogue) return undefined;
    const known = packs.get(lang);
    if (known?.catalogue === catalogue && known.strings === text) return known;
    const pack = { lang, catalogue, strings: text };
    packs.set(lang, pack);
    return pack;
  };

  return {
    englishStrings,
    ready,
    async load(wanted) {
      const lang = supported(wanted);
      await Promise.all([loadStrings(lang), catalogues.load(lang)]);
      return ready(lang) as LanguagePack;
    },
    async refresh(wanted, force) {
      const lang = supported(wanted);
      return (await catalogues.refresh(lang, force)) ? ready(lang) : undefined;
    },
  };
}
