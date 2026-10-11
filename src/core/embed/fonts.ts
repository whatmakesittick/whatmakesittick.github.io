import interUrl from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url';
import monoUrl from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2?url';
import monoMediumUrl from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2?url';

const FACES = [
  { family: 'Inter Variable', url: interUrl, weight: '100 900' },
  { family: 'JetBrains Mono', url: monoUrl, weight: '400' },
  { family: 'JetBrains Mono', url: monoMediumUrl, weight: '500' },
] as const;

let requested = false;

export function loadLatinFonts(): void {
  if (requested || typeof FontFace === 'undefined' || !document.fonts) return;
  requested = true;
  for (const { family, url, weight } of FACES) {
    const source = `url(${new URL(url, import.meta.url).href}) format('woff2')`;
    new FontFace(family, source, { weight, display: 'swap' })
      .load()
      .then((face) => document.fonts.add(face))
      .catch(() => {});
  }
}
