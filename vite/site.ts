import type { LanguageCode } from '../src/core/i18n/languages.ts';
import { languagePath } from '../src/core/i18n/paths.ts';

export const SITE_URL = 'https://whatmakesittick.github.io';
export const SITE_NAME = 'What makes it tick';
export const REPOSITORY_URL = 'https://github.com/whatmakesittick/whatmakesittick.github.io';
export const LICENSE_URL = `${REPOSITORY_URL}/blob/main/LICENSE`;
export const AUTHOR = { name: 'Vitalii Elenhaupt', url: 'https://github.com/veelenga' } as const;
export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 } as const;
export const SITE_SOCIAL = {
  image: 'social/og-image.png',
  alt: 'Cutaway 3D model of an inline four engine with labelled parts, beside the title What makes it tick',
} as const;

export function siteUrl(path = ''): string {
  return `${SITE_URL}/${path}`;
}

export function pageUrl(code: LanguageCode, page = ''): string {
  return siteUrl(languagePath(code, page));
}

export function explainerUrl(slug: string): string {
  return siteUrl(`${slug}/`);
}

export function explainerSourceUrl(slug: string): string {
  return `${REPOSITORY_URL}/tree/main/explainers/${slug}`;
}
