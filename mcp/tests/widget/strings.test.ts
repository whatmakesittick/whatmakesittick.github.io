import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LANGUAGE_CODES, type LanguageCode } from '../../../src/core/i18n/languages.ts';
import { STRINGS, stringsFor } from '../../widget/src/i18n/all.ts';
import { CORE_KEYS } from '../../widget/src/i18n/strings.ts';

type Leaf = { path: string; value: unknown };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function coreLocale(lang: LanguageCode): object {
  return JSON.parse(readFileSync(resolve(root, `src/core/locales/${lang}.json`), 'utf8')) as object;
}

function leaves(node: unknown, prefix = ''): Leaf[] {
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([key, value]) =>
      leaves(value, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [{ path: prefix, value: node }];
}

function texts(value: unknown): string[] {
  if (typeof value === 'function') {
    const call = value as (...args: unknown[]) => unknown;
    const numbers = Array.from({ length: call.length }, (_, i) => (i === 0 ? 3 : 7));
    const ones = Array.from({ length: call.length }, () => 1);
    return [call(...numbers), call(...numbers.map(String)), call(...ones)].map(String);
  }
  return [String(value)];
}

function byPath(list: Leaf[]): Leaf[] {
  return [...list].sort((a, b) => a.path.localeCompare(b.path));
}

const coreKeys = Object.keys(CORE_KEYS);
const english = byPath(leaves(STRINGS.en).filter((l) => !coreKeys.includes(l.path)));

describe('widget strings', () => {
  it('covers every site language', () => {
    expect(Object.keys(STRINGS).sort()).toEqual([...LANGUAGE_CODES].sort());
  });

  it.each(LANGUAGE_CODES)('%s has every widget key with the English arity', (lang) => {
    const set = byPath(leaves(STRINGS[lang]).filter((l) => !coreKeys.includes(l.path)));
    expect(set.map((l) => l.path)).toEqual(english.map((l) => l.path));
    set.forEach((leaf, i) => {
      const source = english[i].value;
      expect(typeof leaf.value, leaf.path).toBe(typeof source);
      if (typeof source === 'function' && typeof leaf.value === 'function') {
        expect(leaf.value.length, leaf.path).toBe(source.length);
      }
    });
  });

  it.each(LANGUAGE_CODES)('%s finds every core key in its site locale', (lang) => {
    const core = coreLocale(lang);
    for (const path of Object.values(CORE_KEYS)) {
      const value = path
        .split('.')
        .reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], core);
      expect(typeof value, `${lang} ${path}`).toBe('string');
      expect(value, `${lang} ${path}`).not.toBe('');
    }
  });

  it.each(LANGUAGE_CODES)('%s resolves to clean copy', (lang) => {
    const resolved = stringsFor(lang, coreLocale(lang));
    expect(byPath(leaves(resolved)).map((l) => l.path)).toEqual(
      byPath(leaves(STRINGS.en)).map((l) => l.path),
    );
    for (const leaf of leaves(resolved)) {
      for (const text of texts(leaf.value)) {
        expect(text.trim(), leaf.path).not.toBe('');
        expect(text, leaf.path).not.toMatch(/[–—]/);
        expect(text, leaf.path).not.toMatch(/undefined|NaN/);
      }
    }
  });

  it('reads the core keys from the site locale', () => {
    const s = stringsFor('de', coreLocale('de'));
    expect(s.fullscreen).toBe('Modell im Vollbild ansehen');
    expect(s.exploreMore).toBe('Weitere Erklärungen');
    expect(stringsFor('de').fullscreen).toBe('Show the model full screen');
  });

  it.each(LANGUAGE_CODES)('%s keeps the interpolated values', (lang) => {
    const s = stringsFor(lang);
    expect(s.chapterIndex('3', '7')).toContain('3');
    expect(s.chapterIndex('3', '7')).toContain('7');
    expect(s.nextNamed('Ignition')).toContain('Ignition');
    expect(s.count(12)).toContain('12');
  });

  it('declines the Ukrainian count', () => {
    const s = stringsFor('uk');
    expect([1, 3, 5, 11, 22, 25].map((n) => s.count(n))).toEqual([
      '1 пояснення',
      '3 пояснення',
      '5 пояснень',
      '11 пояснень',
      '22 пояснення',
      '25 пояснень',
    ]);
  });
});
