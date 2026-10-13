import sources from 'virtual:wmit-languages';
import { WIDGET_MODULE_FILE } from '../../../shared/loader.ts';
import type { LanguageCode } from '../../../../src/core/i18n/languages.ts';
import { createCatalogues } from '../catalogue.ts';
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
  if (!source) return Promise.reject(new Error(`no language chunk for ${lang}`));
  return source();
}

interface FreshWidget {
  languageData: (lang: LanguageCode) => Promise<LanguageData>;
}

export const freshLanguage =
  (assetBase: string): FreshLanguage =>
  async (lang) => {
    const url = `${assetBase}${WIDGET_MODULE_FILE}${freshQuery()}`;
    const widget = (await import(/* @vite-ignore */ url)) as FreshWidget;
    return widget.languageData(lang);
  };

export const bundledPacks = (assetBase: string, freshWidget = true) =>
  createPacks(
    createCatalogues(assetBase),
    bundled,
    freshWidget ? freshLanguage(assetBase) : undefined,
  );
