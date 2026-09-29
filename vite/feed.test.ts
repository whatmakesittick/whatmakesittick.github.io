import { describe, expect, it } from 'vitest';
import type { LanguageCode } from '../src/core/i18n/languages.ts';
import { renderFeed } from './feed.ts';
import type { PageLanguage } from './i18n.ts';
import type { LoadedExplainer } from './manifest.ts';

const meta = {
  title: 'How a "thing" works',
  eyebrow: 'Opened up',
  tagline: 'Slowed right down',
  description: 'A look inside',
  summary: 'Gears & <springs>',
};

function explainer(
  slug: string,
  published: string,
  locales: LanguageCode[] = ['en', 'uk'],
): LoadedExplainer {
  return {
    manifest: {
      slug,
      tags: ['tools', 'mechanics'],
      cover: 'cover.webp',
      entry: 'src/index.ts',
      chapters: 'chapters.html',
      locales,
      social: { image: 'social/card.png', alt: 'A thing' },
    },
    directory: `/repo/explainers/${slug}`,
    meta,
    metas: { en: meta, uk: { ...meta, title: 'Як працює річ', summary: 'Шестерні' } },
    dictionaries: {},
    chapters: '',
    dates: { published, modified: published },
  };
}

const explainers = [
  explainer('older', '2026-01-10T09:00:00+02:00'),
  explainer('newer', '2026-03-10T09:00:00+02:00'),
  explainer('english-only', '2026-02-10T09:00:00Z', ['en']),
];

const copy: Record<string, string> = {
  'catalogue.metaTitle': 'What makes it tick: how things work',
  'catalogue.tagline': 'Interactive 3D explainers',
};

function language(code: LanguageCode): PageLanguage {
  return { code, translate: (key) => copy[key] ?? key };
}

function items(xml: string): string[] {
  return [...xml.matchAll(/<item>[\s\S]*?<\/item>/g)].map(([item]) => item);
}

function links(xml: string): string[] {
  return items(xml).map((item) => /<link>(.*)<\/link>/.exec(item)?.[1] ?? '');
}

describe('renderFeed', () => {
  const english = renderFeed(explainers, language('en'));

  it('describes the catalogue as an rss 2.0 channel that points at itself', () => {
    expect(english).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<rss version="2.0"/);
    expect(english).toContain('<title>What makes it tick: how things work</title>');
    expect(english).toContain('<link>https://whatmakesittick.github.io/</link>');
    expect(english).toContain('<description>Interactive 3D explainers</description>');
    expect(english).toContain('<language>en</language>');
    expect(english).toContain(
      '<atom:link href="https://whatmakesittick.github.io/feed.xml" rel="self" type="application/rss+xml" />',
    );
  });

  it('lists the explainers newest first and dates the channel by the newest one', () => {
    expect(links(english)).toEqual([
      'https://whatmakesittick.github.io/newer/',
      'https://whatmakesittick.github.io/english-only/',
      'https://whatmakesittick.github.io/older/',
    ]);
    expect(english).toContain('<lastBuildDate>Tue, 10 Mar 2026 07:00:00 GMT</lastBuildDate>');
  });

  it('writes each item with an escaped title, summary, permalink, date and tags', () => {
    const [newer] = items(english);
    expect(newer).toContain('<title>How a &quot;thing&quot; works</title>');
    expect(newer).toContain('<description>Gears &amp; &lt;springs&gt;</description>');
    expect(newer).toContain(
      '<guid isPermaLink="true">https://whatmakesittick.github.io/newer/</guid>',
    );
    expect(newer).toContain('<pubDate>Tue, 10 Mar 2026 07:00:00 GMT</pubDate>');
    expect(newer).toContain('<category>tools</category>\n      <category>mechanics</category>');
  });

  it('keeps a translated feed to the explainers that ship its language', () => {
    const ukrainian = renderFeed(explainers, language('uk'));
    expect(links(ukrainian)).toEqual([
      'https://whatmakesittick.github.io/uk/newer/',
      'https://whatmakesittick.github.io/uk/older/',
    ]);
    expect(ukrainian).toContain('<title>Як працює річ</title>');
    expect(ukrainian).toContain('href="https://whatmakesittick.github.io/uk/feed.xml"');
  });

  it('leaves out the build date when there is nothing to list', () => {
    expect(renderFeed([], language('en'))).not.toContain('<lastBuildDate>');
  });
});
