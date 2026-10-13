import interUrl from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url';
import interCyrillicUrl from '@fontsource-variable/inter/files/inter-cyrillic-wght-normal.woff2?url';
import monoUrl from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2?url';
import monoCyrillicUrl from '@fontsource/jetbrains-mono/files/jetbrains-mono-cyrillic-400-normal.woff2?url';
import monoMediumUrl from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2?url';
import monoMediumCyrillicUrl from '@fontsource/jetbrains-mono/files/jetbrains-mono-cyrillic-500-normal.woff2?url';
import type { LanguageCode } from '../i18n/languages';
import { stableFontPath, type EmbedFont } from './fontFiles';

interface Face {
  family: string;
  url: string;
  stable: EmbedFont;
  weight: string;
  unicodeRange?: string;
}

const CYRILLIC_RANGE = 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116';

const LATIN: readonly Face[] = [
  { family: 'Inter Variable', url: interUrl, stable: 'inter', weight: '100 900' },
  { family: 'JetBrains Mono', url: monoUrl, stable: 'mono', weight: '400' },
  { family: 'JetBrains Mono', url: monoMediumUrl, stable: 'monoMedium', weight: '500' },
];

const cyrillic = (face: Face): Face => ({ ...face, unicodeRange: CYRILLIC_RANGE });

const CYRILLIC: readonly Face[] = [
  cyrillic({
    family: 'Inter Variable',
    url: interCyrillicUrl,
    stable: 'interCyrillic',
    weight: '100 900',
  }),
  cyrillic({
    family: 'JetBrains Mono',
    url: monoCyrillicUrl,
    stable: 'monoCyrillic',
    weight: '400',
  }),
  cyrillic({
    family: 'JetBrains Mono',
    url: monoMediumCyrillicUrl,
    stable: 'monoMediumCyrillic',
    weight: '500',
  }),
];

const EXTRA_SUBSETS: Partial<Record<LanguageCode, readonly Face[]>> = { uk: CYRILLIC };

const requested = new Set<readonly Face[]>();

export function fontSource(url: string, stable: EmbedFont): string {
  return [url, stableFontPath(stable)]
    .map((path) => `url(${new URL(path, import.meta.url).href}) format('woff2')`)
    .join(', ');
}

function load(faces: readonly Face[]): void {
  if (requested.has(faces) || typeof FontFace === 'undefined' || !document.fonts) return;
  requested.add(faces);
  for (const { family, url, stable, weight, unicodeRange } of faces) {
    const source = fontSource(url, stable);
    const descriptors = unicodeRange ? { weight, unicodeRange } : { weight };
    new FontFace(family, source, { ...descriptors, display: 'swap' })
      .load()
      .then((face) => document.fonts.add(face))
      .catch(() => {});
  }
}

export function loadFonts(language: LanguageCode): void {
  load(LATIN);
  const extra = EXTRA_SUBSETS[language];
  if (extra) load(extra);
}
