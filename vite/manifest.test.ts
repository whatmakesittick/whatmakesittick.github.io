import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadExplainers, parseManifest, parseMeta, reservedSlugs } from './manifest.ts';
import { checkFormerSlugs } from './manifestSchema.ts';

const valid = {
  slug: 'engine',
  tags: ['engines', 'mechanics'],
  topic: 'car engine',
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
    ['no topic', { topic: undefined }, 'engine', '"topic" must be a string'],
    ['an empty topic', { topic: ' ' }, 'engine', '"topic" must be a string'],
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

  it('reads the slugs the explainer had before', () => {
    const renamed = { ...valid, formerSlugs: ['car-engine', 'motor'] };
    expect(parseManifest(renamed, 'engine', reserved)).toEqual(renamed);
  });

  it.each([
    ['an empty list', [], 'must list at least one slug'],
    ['a list of other things', 'motor', 'must list at least one slug'],
    ['a slug with capitals', ['Motor'], 'lowercase words joined by dashes'],
    ['a slug that is not text', [7], 'lowercase words joined by dashes'],
    ['the current slug', ['engine'], 'lists the current slug "engine"'],
    ['a reserved name', ['assets'], 'lists the reserved "assets"'],
    ['a repeated slug', ['motor', 'motor'], 'lists "motor" more than once'],
  ])('rejects former slugs with %s', (_case, formerSlugs, message) => {
    expect(() => parseManifest({ ...valid, formerSlugs }, 'engine', reserved)).toThrow(message);
  });
});

describe('checkFormerSlugs', () => {
  it('accepts former slugs that no explainer uses', () => {
    expect(() =>
      checkFormerSlugs([
        { slug: 'engine', formerSlugs: ['motor'] },
        { slug: 'glider', formerSlugs: ['sailplane'] },
        { slug: 'heart' },
      ]),
    ).not.toThrow();
  });

  it('rejects a former slug that is the slug of another explainer', () => {
    expect(() =>
      checkFormerSlugs([{ slug: 'engine', formerSlugs: ['glider'] }, { slug: 'glider' }]),
    ).toThrow(
      'explainers/engine/explainer.json: "formerSlugs" lists "glider", the slug of another',
    );
  });

  it('rejects a former slug that two explainers list', () => {
    expect(() =>
      checkFormerSlugs([
        { slug: 'engine', formerSlugs: ['motor'] },
        { slug: 'glider', formerSlugs: ['motor'] },
      ]),
    ).toThrow('which explainers/engine/explainer.json lists too');
  });
});

describe('parseMeta', () => {
  const meta = { title: 'T', eyebrow: 'E', tagline: 'L', description: 'D', summary: 'S' };

  it('reads the meta block of a locale', () => {
    expect(parseMeta({ meta, other: {} }, 'engine', 'en')).toEqual(meta);
  });

  it('reads the optional alt text of the social image', () => {
    const socialAlt = 'Ein Motor';
    expect(parseMeta({ meta: { ...meta, socialAlt } }, 'engine', 'de').socialAlt).toBe(socialAlt);
    expect(parseMeta({ meta }, 'engine', 'de').socialAlt).toBeUndefined();
    expect(() => parseMeta({ meta: { ...meta, socialAlt: ' ' } }, 'engine', 'de')).toThrow(
      'socialAlt',
    );
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

  it('reserves the about page for its own folder', () => {
    expect([...reservedSlugs(createRoot())]).toEqual(expect.arrayContaining(['about']));
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
