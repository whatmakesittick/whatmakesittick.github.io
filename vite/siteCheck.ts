import { parse } from 'node-html-parser';
import type { HTMLElement } from 'node-html-parser';
import { DEFAULT_LANGUAGE } from '../src/core/i18n/languages.ts';
import type { LanguageCode } from '../src/core/i18n/languages.ts';
import { splitLanguagePath } from '../src/core/i18n/paths.ts';
import { descriptionLimit } from '../src/core/manifest.ts';
import { FEED_TYPE, SITE_URL, feedUrl } from './site.ts';

export interface BuiltPage {
  path: string;
  html: string;
}

export interface BuiltSite {
  pages: readonly BuiltPage[];
  scripts: ReadonlyMap<string, string>;
  gzipBytes: ReadonlyMap<string, number>;
  sitemap: string;
  robots: string;
  feeds: ReadonlyMap<LanguageCode, string>;
  notFound: string;
  favicon: Uint8Array;
}

export const JS_BUDGET_GZIP = { catalogue: 50_000, explainer: 300_000 } as const;
export const MORE_EXPLAINERS = 3;

const SITE_NAME = 'What makes it tick';
const BLOCKED_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const THREE_CHUNK = /\/three-[^/]*\.js$/;
const STATIC_IMPORT = /(?:from|import)\s*"(\.\/[^"]+\.js)"/g;
const EXTERNAL = /^https?:/;
const ICO_HEADER = [0, 0, 1, 0];
const X_DEFAULT = 'x-default';
const LOCATION = /<loc>([^<]+)<\/loc>/g;
const FEED_ITEM = /<guid isPermaLink="true">([^<]+)<\/guid>/g;
const NOSCRIPT_COVER = /<noscript>[\s\S]*?class="stage-cover"[\s\S]*?<\/noscript>/;

function pageLanguage(path: string): LanguageCode {
  return splitLanguagePath(path).code ?? DEFAULT_LANGUAGE;
}

function isCatalogue(path: string): boolean {
  return splitLanguagePath(path).page === '';
}

function attribute(root: HTMLElement, selector: string, name: string): string | undefined {
  return root.querySelector(selector)?.getAttribute(name);
}

function resolveImport(from: string, specifier: string): string {
  return from.slice(0, from.lastIndexOf('/') + 1) + specifier.slice(2);
}

export function loadedScripts(root: HTMLElement, scripts: ReadonlyMap<string, string>): string[] {
  const queue = [
    ...root.querySelectorAll('script[type="module"][src]').map((tag) => tag.getAttribute('src')),
    ...root
      .querySelectorAll('link[rel="modulepreload"][href]')
      .map((tag) => tag.getAttribute('href')),
  ].filter((href): href is string => href !== undefined);
  const loaded = new Set<string>();
  while (queue.length > 0) {
    const href = queue.shift();
    if (href === undefined || loaded.has(href)) continue;
    loaded.add(href);
    for (const [, specifier] of (scripts.get(href) ?? '').matchAll(STATIC_IMPORT)) {
      queue.push(resolveImport(href, specifier));
    }
  }
  return [...loaded];
}

function headProblems(page: BuiltPage, root: HTMLElement): string[] {
  const problems: string[] = [];
  const language = pageLanguage(page.path);
  const canonical = `${SITE_URL}${page.path}`;
  if (attribute(root, 'html', 'lang') !== language) problems.push(`lang is not ${language}`);
  const title = root.querySelector('title')?.text.trim() ?? '';
  if (!title.includes(SITE_NAME)) problems.push(`title lacks the site name: "${title}"`);
  const description = attribute(root, 'meta[name="description"]', 'content') ?? '';
  const limit = descriptionLimit(language);
  if (description.length === 0) problems.push('description is missing');
  if (description.length > limit)
    problems.push(`description has ${description.length} characters, limit ${limit}`);
  if (attribute(root, 'link[rel="canonical"]', 'href') !== canonical)
    problems.push(`canonical is not ${canonical}`);
  const alternates = root.querySelectorAll('link[rel="alternate"][hreflang]');
  const codes = alternates.map((tag) => tag.getAttribute('hreflang'));
  const targets = alternates.map((tag) => tag.getAttribute('href'));
  if (!codes.includes(X_DEFAULT)) problems.push('hreflang links lack x-default');
  if (!codes.includes(language) || !targets.includes(canonical))
    problems.push('hreflang links lack the page itself');
  const data = root.querySelectorAll('script[type="application/ld+json"]');
  if (data.length !== 1) problems.push(`${data.length} json-ld blocks instead of 1`);
  try {
    JSON.parse(data[0]?.text ?? '');
  } catch {
    problems.push('json-ld does not parse');
  }
  const feed = attribute(root, `link[rel="alternate"][type="${FEED_TYPE}"]`, 'href');
  if (feed !== feedUrl(language)) problems.push(`feed link is not ${feedUrl(language)}`);
  if (root.querySelectorAll('h1').length !== 1) problems.push('not exactly one h1');
  return problems;
}

function deliveryProblems(page: BuiltPage, root: HTMLElement, site: BuiltSite): string[] {
  const problems: string[] = [];
  BLOCKED_HOSTS.filter((host) => page.html.includes(host)).forEach((host) =>
    problems.push(`references ${host}`),
  );
  root
    .querySelectorAll('link[rel="stylesheet"][href]')
    .filter((tag) => EXTERNAL.test(tag.getAttribute('href') ?? ''))
    .forEach((tag) => problems.push(`loads an external stylesheet ${tag.getAttribute('href')}`));
  const scripts = loadedScripts(root, site.scripts);
  const bytes = scripts.reduce((sum, href) => sum + (site.gzipBytes.get(href) ?? 0), 0);
  const budget = isCatalogue(page.path) ? JS_BUDGET_GZIP.catalogue : JS_BUDGET_GZIP.explainer;
  if (bytes > budget) problems.push(`loads ${bytes} gzipped bytes of JavaScript, budget ${budget}`);
  if (isCatalogue(page.path) && scripts.some((href) => THREE_CHUNK.test(href)))
    problems.push('loads the three.js chunk');
  if (
    pageLanguage(page.path) !== DEFAULT_LANGUAGE &&
    root.querySelectorAll('link[rel="modulepreload"]').length === 0
  ) {
    problems.push('preloads no language chunk');
  }
  return problems;
}

function contentProblems(page: BuiltPage, root: HTMLElement, explainers: number): string[] {
  const problems: string[] = [];
  if (root.querySelectorAll('select[data-language-select] option').length === 0) {
    problems.push('language dropdown has no prerendered options');
  }
  if (isCatalogue(page.path)) {
    const cards = root.querySelectorAll('a.card').length;
    if (cards !== explainers)
      problems.push(`links ${cards} explainer cards instead of ${explainers}`);
    return problems;
  }
  if (!NOSCRIPT_COVER.test(page.html)) problems.push('has no noscript cover');
  const more = root.querySelectorAll('a.more-explainer').length;
  const expected = Math.min(MORE_EXPLAINERS, explainers - 1);
  if (more !== expected) problems.push(`links ${more} more explainers instead of ${expected}`);
  return problems;
}

function feedProblems(site: BuiltSite): string[] {
  const languages = [...new Set(site.pages.map((page) => pageLanguage(page.path)))];
  return languages.flatMap((language) => {
    const feed = site.feeds.get(language);
    if (feed === undefined) return [`the ${language} feed is missing`];
    const listed = [...feed.matchAll(FEED_ITEM)].map(([, url]) => url).sort();
    const expected = site.pages
      .filter((page) => pageLanguage(page.path) === language && !isCatalogue(page.path))
      .map((page) => `${SITE_URL}${page.path}`)
      .sort();
    return listed.join('\n') === expected.join('\n')
      ? []
      : [`the ${language} feed does not list exactly the built explainers`];
  });
}

function siteProblems(site: BuiltSite): string[] {
  const problems: string[] = [...feedProblems(site)];
  const listed = [...site.sitemap.matchAll(LOCATION)].map(([, url]) => url).sort();
  const expected = site.pages.map((page) => `${SITE_URL}${page.path}`).sort();
  if (listed.join('\n') !== expected.join('\n'))
    problems.push('sitemap.xml does not list exactly the built pages');
  if (!site.robots.includes('Sitemap:')) problems.push('robots.txt does not point at the sitemap');
  if (!site.notFound.includes('name="robots" content="noindex"'))
    problems.push('404.html is not noindex');
  if (site.notFound.includes('<script')) problems.push('404.html loads scripts');
  if (ICO_HEADER.some((byte, index) => site.favicon[index] !== byte))
    problems.push('favicon.ico is not an ico file');
  return problems;
}

export function checkSite(site: BuiltSite): string[] {
  const explainers = site.pages.filter(
    (page) => pageLanguage(page.path) === DEFAULT_LANGUAGE && !isCatalogue(page.path),
  ).length;
  const pageProblems = site.pages.flatMap((page) => {
    const root = parse(page.html);
    return [
      ...headProblems(page, root),
      ...deliveryProblems(page, root, site),
      ...contentProblems(page, root, explainers),
    ].map((problem) => `${page.path}: ${problem}`);
  });
  return [...pageProblems, ...siteProblems(site)];
}
