import { extname } from 'node:path';
import { DEFAULT_LANGUAGE, LANGUAGES } from '../src/core/i18n/languages.ts';
import type { LanguageCode } from '../src/core/i18n/languages.ts';
import type { CatalogueEntry } from '../src/core/manifest.ts';
import type { LoadedExplainer } from './manifest.ts';
import {
  AUTHOR,
  LICENSE_URL,
  REPOSITORY_URL,
  SITE_NAME,
  SITE_URL,
  SOCIAL_IMAGE_SIZE,
  explainerSourceUrl,
  explainerUrl,
} from './site.ts';
import { escapeHtml, expandPartials, fillTemplate } from './template.ts';
import type { TemplateValues } from './template.ts';

const IMAGE_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};
const JSON_INDENT = 2;

export const CORE_ALIAS = '@core';
export const MOUNT_MODULE = `${CORE_ALIAS}/mount`;

function imageType(file: string): string {
  const type = IMAGE_TYPES[extname(file).toLowerCase()];
  if (!type) throw new Error(`Unsupported social image type: ${file}`);
  return type;
}

function openGraphLocale(code: LanguageCode): string {
  return LANGUAGES.find((language) => language.code === code)?.locale ?? code;
}

function localeTags(locales: readonly LanguageCode[]): string {
  const alternates = locales.filter((code) => code !== DEFAULT_LANGUAGE);
  return [
    `<meta property="og:locale" content="${openGraphLocale(DEFAULT_LANGUAGE)}" />`,
    ...alternates.map(
      (code) => `<meta property="og:locale:alternate" content="${openGraphLocale(code)}" />`,
    ),
  ].join('\n');
}

function structuredData(explainer: LoadedExplainer, image: string): string {
  const { manifest, meta } = explainer;
  const data = {
    '@context': 'https://schema.org',
    '@type': ['WebPage', 'TechArticle'],
    name: meta.title,
    headline: meta.title,
    description: meta.description,
    url: explainerUrl(manifest.slug),
    image,
    inLanguage: DEFAULT_LANGUAGE,
    author: { '@type': 'Person', ...AUTHOR },
  };
  return JSON.stringify(data, null, JSON_INDENT).replaceAll('</', '<\\/');
}

export function siteValues(sourceUrl: string): TemplateValues {
  return {
    siteName: escapeHtml(SITE_NAME),
    siteUrl: escapeHtml(`${SITE_URL}/`),
    repositoryUrl: escapeHtml(REPOSITORY_URL),
    licenseUrl: escapeHtml(LICENSE_URL),
    sourceUrl: escapeHtml(sourceUrl),
  };
}

export function renderPage(
  template: string,
  partials: TemplateValues,
  explainer: LoadedExplainer,
): string {
  const { manifest, meta } = explainer;
  const image = `${explainerUrl(manifest.slug)}${manifest.social.image}`;
  return fillTemplate(expandPartials(template, partials), {
    ...siteValues(explainerSourceUrl(manifest.slug)),
    title: escapeHtml(meta.title),
    description: escapeHtml(meta.description),
    eyebrow: escapeHtml(meta.eyebrow),
    tagline: escapeHtml(meta.tagline),
    url: escapeHtml(explainerUrl(manifest.slug)),
    image: escapeHtml(image),
    imageType: imageType(manifest.social.image),
    imageWidth: String(SOCIAL_IMAGE_SIZE.width),
    imageHeight: String(SOCIAL_IMAGE_SIZE.height),
    imageAlt: escapeHtml(manifest.social.alt),
    localeTags: localeTags(manifest.locales),
    structuredData: structuredData(explainer, image),
    chapters: explainer.chapters,
  });
}

function localeLoader(localesRoot: string, code: LanguageCode): string {
  return code === DEFAULT_LANGUAGE
    ? `  ${code}: () => Promise.resolve(${code}),`
    : `  ${code}: () => import('${localesRoot}/${code}.json').then((module) => module.default),`;
}

export function renderEntry(manifest: LoadedExplainer['manifest']): string {
  const explainerRoot = `../explainers/${manifest.slug}`;
  const localesRoot = `${explainerRoot}/locales`;
  return [
    `import { mountExplainer } from '${MOUNT_MODULE}';`,
    `import explainer from '${explainerRoot}/${manifest.entry}';`,
    `import ${DEFAULT_LANGUAGE} from '${localesRoot}/${DEFAULT_LANGUAGE}.json';`,
    '',
    'await mountExplainer(explainer, {',
    ...manifest.locales.map((code) => localeLoader(localesRoot, code)),
    '});',
    '',
  ].join('\n');
}

export function catalogueEntries(explainers: readonly LoadedExplainer[]): CatalogueEntry[] {
  return explainers.map(({ manifest, metas }) => ({ manifest, meta: metas }));
}

export function renderCatalogueModule(explainers: readonly LoadedExplainer[]): string {
  return `export const entries = ${JSON.stringify(catalogueEntries(explainers))};\n`;
}
