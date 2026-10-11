import type { BakedCatalogue } from '../../../shared/catalogue.ts';
import { DEFAULT_LANGUAGE, type LanguageCode } from '../../../../src/core/i18n/languages.ts';
import { resolveStrings, type Strings, type WidgetStrings } from './strings.ts';

export interface LanguageData {
  catalogue: BakedCatalogue;
  core: object;
  widget: WidgetStrings;
}

export type LanguageSources = Partial<Record<LanguageCode, () => Promise<LanguageData>>>;

export interface LanguagePack {
  lang: LanguageCode;
  catalogue: BakedCatalogue;
  strings: Strings;
}

export interface Packs {
  english: LanguagePack;
  ready(lang: LanguageCode): LanguagePack | undefined;
  load(lang: LanguageCode): Promise<LanguagePack>;
}

export function createPacks(english: BakedCatalogue, sources: LanguageSources): Packs {
  const base: LanguagePack = {
    lang: DEFAULT_LANGUAGE,
    catalogue: english,
    strings: resolveStrings(),
  };
  const loaded = new Map<LanguageCode, LanguagePack>([[DEFAULT_LANGUAGE, base]]);
  const pending = new Map<LanguageCode, Promise<LanguagePack>>();
  return {
    english: base,
    ready: (lang) => loaded.get(lang),
    load(lang) {
      const done = loaded.get(lang);
      if (done) return Promise.resolve(done);
      const source = sources[lang];
      if (!source) return Promise.resolve(base);
      let promise = pending.get(lang);
      if (!promise) {
        promise = source().then(({ catalogue, core, widget }) => {
          const pack = { lang, catalogue, strings: resolveStrings(widget, core) };
          loaded.set(lang, pack);
          return pack;
        });
        promise.then(
          () => pending.delete(lang),
          () => pending.delete(lang),
        );
        pending.set(lang, promise);
      }
      return promise;
    },
  };
}
