import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadExplainers, parseManifest, parseMeta, reservedSlugs } from './manifest.ts';

const valid = {
  slug: 'engine',
  tags: ['engines', 'mechanics'],
  cover: 'cover.webp',
  entry: 'src/index.ts',
  chapters: 'chapters.html',
  locales: ['en', 'uk'],
  social: { image: 'social/og-image.png', alt: 'An engine' },
};

const reserved = new Set(['assets', 'social']);
const roots: string[] = [];

function createRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'explainers-'));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('parseManifest', () => {
  it('reads a complete manifest', () => {
    expect(parseManifest(valid, 'engine', reserved)).toEqual(valid);
  });

  it('requires the slug to match its folder', () => {
    expect(() => parseManifest(valid, 'gearbox', reserved)).toThrow('must match the folder name');
  });

  it.each([
    ['a project folder slug', { slug: 'assets' }, 'assets', 'is reserved'],
    ['a public folder slug', { slug: 'social' }, 'social', '"slug" "social" is reserved'],
    ['no tags', { tags: [] }, 'engine', '"tags" must list at least one tag'],
    ['tags that are not a list', { tags: 'engines' }, 'engine', '"tags" must list at least one'],
    ['an unknown tag', { tags: ['engines', 'toys'] }, 'engine', '"tags" must be among mechanics'],
    ['a repeated tag', { tags: ['home', 'home'] }, 'engine', '"tags" lists "home" more than once'],
    ['an unknown language', { locales: ['en', 'xx'] }, 'engine', 'unknown language'],
    ['no English', { locales: ['uk'] }, 'engine', 'must include "en"'],
    [
      'a repeated language',
      { locales: ['en', 'uk', 'en'] },
      'engine',
      'explainers/engine/explainer.json: "locales" lists "en" more than once',
    ],
    ['no social image', { social: undefined }, 'engine', '"social" must name'],
    ['an empty entry', { entry: ' ' }, 'engine', '"entry" must be a string'],
  ])('rejects %s', (_case, change, folder, message) => {
    expect(() => parseManifest({ ...valid, ...change }, folder, reserved)).toThrow(message);
  });

  it('names the manifest in its errors', () => {
    expect(() => parseManifest([], 'engine', reserved)).toThrow('explainers/engine/explainer.json');
  });
});

describe('parseMeta', () => {
  const meta = { title: 'T', eyebrow: 'E', tagline: 'L', description: 'D', summary: 'S' };

  it('reads the meta block of a locale', () => {
    expect(parseMeta({ meta, other: {} }, 'engine', 'en')).toEqual(meta);
  });

  it('asks for every meta field', () => {
    expect(() => parseMeta({ meta: { ...meta, summary: '' } }, 'engine', 'uk')).toThrow('summary');
    expect(() => parseMeta({}, 'engine', 'uk')).toThrow('locales/uk.json needs a "meta" block');
  });
});

describe('reservedSlugs', () => {
  it('reserves the project folders and every name published from public/', () => {
    const root = createRoot();
    mkdirSync(join(root, 'public', 'social'), { recursive: true });
    writeFileSync(join(root, 'public', 'favicon.svg'), '<svg />');
    expect([...reservedSlugs(root)]).toEqual(
      expect.arrayContaining(['src', 'social', 'favicon.svg']),
    );
  });

  it('reserves every language code for the language folders', () => {
    expect([...reservedSlugs(createRoot())]).toEqual(expect.arrayContaining(['uk', 'ja']));
  });
});

describe('loadExplainers', () => {
  it('names the file that is not valid JSON', () => {
    const root = createRoot();
    const directory = join(root, 'explainers', 'broken');
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, 'explainer.json'), '{ "slug": ');
    expect(() => loadExplainers(root)).toThrow(`${join(directory, 'explainer.json')}: `);
  });
});
