export const STABLE_FONT_DIRECTORY = '/embed/v1/fonts/';

export const EMBED_FONTS = {
  inter: '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  mono: '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2',
  monoMedium: '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2',
  interCyrillic: '@fontsource-variable/inter/files/inter-cyrillic-wght-normal.woff2',
  monoCyrillic: '@fontsource/jetbrains-mono/files/jetbrains-mono-cyrillic-400-normal.woff2',
  monoMediumCyrillic: '@fontsource/jetbrains-mono/files/jetbrains-mono-cyrillic-500-normal.woff2',
} as const;

export type EmbedFont = keyof typeof EMBED_FONTS;

export function fontFileName(specifier: string): string {
  return specifier.slice(specifier.lastIndexOf('/') + 1);
}

export function stableFontPath(font: EmbedFont): string {
  return `${STABLE_FONT_DIRECTORY}${fontFileName(EMBED_FONTS[font])}`;
}
