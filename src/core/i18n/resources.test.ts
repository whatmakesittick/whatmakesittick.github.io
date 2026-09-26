import { describe, expect, it } from 'vitest';
import { mergeBundles, mergeDictionaries } from './resources';

describe('mergeDictionaries', () => {
  it('merges nested keys and lets the override win', () => {
    const base = { controls: { play: 'Play', label: 'Controls' }, footer: { source: 'Source' } };
    const override = { controls: { label: 'Engine controls' }, units: { rpm: '{{value}} rpm' } };
    expect(mergeDictionaries(base, override)).toEqual({
      controls: { play: 'Play', label: 'Engine controls' },
      footer: { source: 'Source' },
      units: { rpm: '{{value}} rpm' },
    });
  });

  it('leaves both inputs untouched', () => {
    const base = { controls: { play: 'Play' } };
    mergeDictionaries(base, { controls: { play: 'Start' } });
    expect(base.controls.play).toBe('Play');
  });
});

describe('mergeBundles', () => {
  it('keeps languages that only one side ships', () => {
    const merged = mergeBundles({ en: { a: 'A' }, uk: { a: 'А' } }, { en: { b: 'B' } });
    expect(merged).toEqual({ en: { a: 'A', b: 'B' }, uk: { a: 'А' } });
  });
});
