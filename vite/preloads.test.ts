import { describe, expect, it } from 'vitest';
import { injectModulePreloads, languageChunks } from './preloads.ts';

const ROOT = '/repo';
const chunks = [
  { fileName: 'assets/uk-core.js', facadeModuleId: '/repo/src/core/locales/uk.json' },
  { fileName: 'assets/uk-engine.js', facadeModuleId: '/repo/explainers/engine/locales/uk.json' },
  { fileName: 'assets/uk-glider.js', facadeModuleId: '/repo/explainers/glider/locales/uk.json' },
  { fileName: 'assets/de-engine.js', facadeModuleId: '/repo/explainers/engine/locales/de.json' },
  { fileName: 'assets/uk-about.js', facadeModuleId: '/repo/src/site/about/locales/uk.json' },
  { fileName: 'assets/main.js', facadeModuleId: null },
];

describe('languageChunks', () => {
  it('finds the explainer and the core locale of a language page', () => {
    expect(languageChunks(ROOT, '/uk/engine/index.html', chunks)).toEqual([
      'assets/uk-engine.js',
      'assets/uk-core.js',
    ]);
  });

  it('finds the about and the core locale of an about language page', () => {
    expect(languageChunks(ROOT, '/uk/about/index.html', chunks)).toEqual([
      'assets/uk-about.js',
      'assets/uk-core.js',
    ]);
  });

  it('finds only the core locale of a catalogue language page', () => {
    expect(languageChunks(ROOT, '/uk/index.html', chunks)).toEqual(['assets/uk-core.js']);
  });

  it('finds nothing for an English page, whose copy ships with its script', () => {
    expect(languageChunks(ROOT, '/engine/index.html', chunks)).toEqual([]);
    expect(languageChunks(ROOT, '/index.html', chunks)).toEqual([]);
  });
});

describe('injectModulePreloads', () => {
  const html = [
    '<head>',
    '    <title>Engine</title>',
    '    <script type="module" crossorigin src="/assets/main.js"></script>',
    '  </head>',
  ].join('\n');

  it('adds one preload per file right before the first module script', () => {
    expect(injectModulePreloads(html, ['/assets/uk-engine.js', '/assets/uk-core.js'])).toBe(
      [
        '<head>',
        '    <title>Engine</title>',
        '    <link rel="modulepreload" crossorigin href="/assets/uk-engine.js">',
        '    <link rel="modulepreload" crossorigin href="/assets/uk-core.js">',
        '    <script type="module" crossorigin src="/assets/main.js"></script>',
        '  </head>',
      ].join('\n'),
    );
  });

  it('leaves the page alone without files', () => {
    expect(injectModulePreloads(html, [])).toBe(html);
  });
});
