import english from 'virtual:wmit-catalogue';
import sources from 'virtual:wmit-languages';
import type { BakedCatalogue } from '../../../shared/catalogue.ts';
import { WIDGET_MODULE_FILE } from '../../../shared/loader.ts';
import type { LanguageCode } from '../../../../src/core/i18n/languages.ts';
import { freshQuery } from '../scene.ts';
import {
  createPacks,
  type FreshLanguage,
  type LanguageData,
  type LanguageSources,
} from './packs.ts';

const bundled = sources as LanguageSources;

export function languageData(lang: LanguageCode): Promise<LanguageData> {
  const source = bundled[lang];
  return source ? source() : Promise.reject(new Error(`no language chunk for ${lang}`));
}

interface FreshWidget {
  languageData?: (lang: LanguageCode) => Promise<LanguageData>;
}

export const freshLanguage =
  (assetBase: string): FreshLanguage =>
  async (lang) => {
    const url = `${assetBase}${WIDGET_MODULE_FILE}${freshQuery()}`;
    const widget = (await import(/* @vite-ignore */ url)) as FreshWidget;
    if (typeof widget.languageData !== 'function') throw new Error(`${url} has no languageData`);
    return widget.languageData(lang);
  };

export const bundledPacks = (assetBase?: string) =>
  createPacks(
    english as BakedCatalogue,
    bundled,
    assetBase === undefined ? undefined : freshLanguage(assetBase),
  );
