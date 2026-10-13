import { parse } from 'node-html-parser';
import { describe, expect, it } from 'vitest';
import type { LoadedExplainer } from './manifest.ts';
import { isRedirectStub, redirectStubs, redirectTarget, renderRedirectStub } from './redirects.ts';

function explainer(slug: string, formerSlugs?: string[]): LoadedExplainer {
  return {
    manifest: { slug, locales: ['en', 'de', 'uk'], ...(formerSlugs ? { formerSlugs } : {}) },
  } as LoadedExplainer;
}

describe('renderRedirectStub', () => {
  const html = renderRedirectStub('de', 'engine');
  const root = parse(html);

  it('sends the reader to the new page at once, relative to the old one', () => {
    expect(redirectTarget(html)).toBe('../engine/');
    expect(isRedirectStub(html)).toBe(true);
    expect(root.querySelector('a')?.getAttribute('href')).toBe('../engine/');
  });

  it('points search engines at the new page and keeps itself out of the index', () => {
    expect(root.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://whatmakesittick.github.io/de/engine/',
    );
    expect(root.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex');
    expect(root.querySelector('html')?.getAttribute('lang')).toBe('de');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('hreflang');
  });

  it('is not mistaken for a page', () => {
    expect(isRedirectStub('<!doctype html><title>Engine</title>')).toBe(false);
  });
});

describe('redirectStubs', () => {
  it('writes one stub per former slug and language of the explainer', () => {
    const stubs = redirectStubs([
      explainer('engine', ['motor', 'car-engine']),
      explainer('glider'),
    ]);
    expect(stubs.map(({ fileName }) => fileName)).toEqual([
      'motor/index.html',
      'de/motor/index.html',
      'uk/motor/index.html',
      'car-engine/index.html',
      'de/car-engine/index.html',
      'uk/car-engine/index.html',
    ]);
    expect(stubs.every(({ source }) => redirectTarget(source) === '../engine/')).toBe(true);
    expect(stubs[0]?.contentType).toBe('text/html; charset=utf-8');
  });

  it('writes nothing without renames', () => {
    expect(redirectStubs([explainer('engine')])).toEqual([]);
  });
});
