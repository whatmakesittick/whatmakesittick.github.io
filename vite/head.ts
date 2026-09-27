import { extname } from 'node:path';
import { LANGUAGES } from '../src/core/i18n/languages.ts';
import type { LanguageCode } from '../src/core/i18n/languages.ts';
import { alternates } from './routes.ts';
import type { PageRoute } from './routes.ts';
import { escapeHtml } from './template.ts';

const IMAGE_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};
const JSON_INDENT = 2;

export function imageType(file: string): string {
  const type = IMAGE_TYPES[extname(file).toLowerCase()];
  if (!type) throw new Error(`Unsupported social image type: ${file}`);
  return type;
}

function openGraphLocale(code: LanguageCode): string {
  return LANGUAGES.find((language) => language.code === code)?.locale ?? code;
}

export function localeTags(code: LanguageCode, route: PageRoute): string {
  const alternates = route.languages.filter((language) => language !== code);
  return [
    `<meta property="og:locale" content="${openGraphLocale(code)}" />`,
    ...alternates.map(
      (language) =>
        `<meta property="og:locale:alternate" content="${openGraphLocale(language)}" />`,
    ),
  ].join('\n');
}

export function alternateLinks(route: PageRoute): string {
  return alternates(route)
    .map(
      ({ hreflang, url }) =>
        `<link rel="alternate" hreflang="${hreflang}" href="${escapeHtml(url)}" />`,
    )
    .join('\n');
}

export function jsonLd(data: object): string {
  return JSON.stringify(data, null, JSON_INDENT).replaceAll('</', '<\\/');
}
