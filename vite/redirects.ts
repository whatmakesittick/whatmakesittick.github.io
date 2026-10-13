import type { LanguageCode } from '../src/core/i18n/languages.ts';
import type { LoadedExplainer } from './manifest.ts';
import { pageFolder } from './routes.ts';
import { SITE_NAME, pageUrl } from './site.ts';
import type { SiteFile } from './siteFiles.ts';

export const REDIRECT_ENTRY = 'index.html';
const HTML_TYPE = 'text/html; charset=utf-8';
const REFRESH = /<meta http-equiv="refresh" content="0; url=([^"]+)">/;

export function redirectTarget(html: string): string | undefined {
  return REFRESH.exec(html)?.[1];
}

export function isRedirectStub(html: string): boolean {
  return redirectTarget(html) !== undefined;
}

export function renderRedirectStub(code: LanguageCode, slug: string): string {
  const target = `../${slug}/`;
  const canonical = pageUrl(code, slug);
  return [
    '<!doctype html>',
    `<html lang="${code}">`,
    '<head>',
    '<meta charset="utf-8">',
    `<title>${SITE_NAME}</title>`,
    '<meta name="robots" content="noindex">',
    `<link rel="canonical" href="${canonical}">`,
    `<meta http-equiv="refresh" content="0; url=${target}">`,
    '</head>',
    '<body>',
    `<p><a href="${target}">${canonical}</a></p>`,
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

export function redirectStubs(explainers: readonly LoadedExplainer[]): SiteFile[] {
  return explainers.flatMap(({ manifest }) =>
    (manifest.formerSlugs ?? []).flatMap((former) =>
      manifest.locales.map((code) => ({
        fileName: `${pageFolder(code, former)}/${REDIRECT_ENTRY}`,
        contentType: HTML_TYPE,
        source: renderRedirectStub(code, manifest.slug),
      })),
    ),
  );
}
