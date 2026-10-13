import sources from 'virtual:wmit-languages';
import { embedCatalogueFile, type WidgetCatalogue } from '../../../shared/catalogue.ts';
import { WIDGET_MODULE_FILE } from '../../../shared/loader.ts';
import type { LanguageCode } from '../../../../src/core/i18n/languages.ts';
import { catalogueOf, createCatalogues } from '../catalogue.ts';
import { freshQuery } from '../scene.ts';
import {
  createPacks,
  type FreshLanguage,
  type LanguageData,
  type LanguageSources,
} from './packs.ts';

const bundled = sources as LanguageSources;
const moduleUrl = import.meta.url;

export async function languageData(
  lang: LanguageCode,
): Promise<LanguageData & { catalogue: WidgetCatalogue | undefined }> {
  const source = bundled[lang];
  if (!source) throw new Error(`no language chunk for ${lang}`);
  const url = new URL(`${embedCatalogueFile(lang)}${freshQuery()}`, moduleUrl).href;
  const [data, catalogue] = await Promise.all([
    source(),
    import(/* @vite-ignore */ url).then(catalogueOf, () => undefined),
  ]);
  return { ...data, catalogue };
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

export const bundledPacks = (assetBase: string, freshWidget = true) =>
  createPacks(
    createCatalogues(assetBase),
    bundled,
    freshWidget ? freshLanguage(assetBase) : undefined,
  );
