export const STABLE_FONT_DIRECTORY = '/embed/v1/fonts/';

export const EMBED_FONTS = {
  sans: '@fontsource-variable/source-sans-3/files/source-sans-3-latin-wght-normal.woff2',
  display: '@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2',
  mono: '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2',
  monoMedium: '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2',
  sansCyrillic: '@fontsource-variable/source-sans-3/files/source-sans-3-cyrillic-wght-normal.woff2',
  displayCyrillic:
    '@fontsource-variable/source-serif-4/files/source-serif-4-cyrillic-wght-normal.woff2',
  monoCyrillic: '@fontsource/ibm-plex-mono/files/ibm-plex-mono-cyrillic-400-normal.woff2',
  monoMediumCyrillic: '@fontsource/ibm-plex-mono/files/ibm-plex-mono-cyrillic-500-normal.woff2',
} as const;

export type EmbedFont = keyof typeof EMBED_FONTS;

export function fontFileName(specifier: string): string {
  return specifier.slice(specifier.lastIndexOf('/') + 1);
}

export function stableFontPath(font: EmbedFont): string {
  return `${STABLE_FONT_DIRECTORY}${fontFileName(EMBED_FONTS[font])}`;
}
