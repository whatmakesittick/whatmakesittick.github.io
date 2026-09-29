import type { LanguageCode } from '../src/core/i18n/languages.ts';
import { languagePath } from '../src/core/i18n/paths.ts';

export const SITE_URL = 'https://whatmakesittick.github.io';
export const SITE_NAME = 'What makes it tick';
export const REPOSITORY_URL = 'https://github.com/whatmakesittick/whatmakesittick.github.io';
export const LICENSE_URL = `${REPOSITORY_URL}/blob/main/LICENSE`;
export const ISSUES_URL = `${REPOSITORY_URL}/issues`;
export const PROCESS_URL = `${REPOSITORY_URL}/blob/main/.claude/skills/new-explainer/SKILL.md`;
export const AUTHOR = { name: 'Vitalii Elenhaupt', url: 'https://github.com/veelenga' } as const;
export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 } as const;
export const FEED_FILE = 'feed.xml';
export const FEED_TYPE = 'application/rss+xml';
export const COVER_SIZE = { width: 932, height: 699 } as const;
export const SITE_SOCIAL = {
  image: 'social/og-image.png',
  alt: 'The tick mark, a tick rising from a crank wheel, above the title What makes it tick and the line Interactive 3D explainers of how things work, with a colourful timeline and the site address below',
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

export function feedPath(code: LanguageCode): string {
  return `${languagePath(code)}${FEED_FILE}`;
}

export function feedUrl(code: LanguageCode): string {
  return siteUrl(feedPath(code));
}
