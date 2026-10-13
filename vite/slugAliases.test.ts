import { describe, expect, it } from 'vitest';
import { parseSlugAliases, resolveSlug, slugAliases } from './slugAliases.ts';

describe('slugAliases', () => {
  it('maps every former slug to the current one, sorted', () => {
    expect(
      slugAliases([
        { slug: 'glider', formerSlugs: ['sailplane'] },
        { slug: 'heart' },
        { slug: 'engine', formerSlugs: ['motor', 'car-engine'] },
      ]),
    ).toEqual({ 'car-engine': 'engine', motor: 'engine', sailplane: 'glider' });
    expect(Object.keys(slugAliases([{ slug: 'b', formerSlugs: ['z', 'a'] }]))).toEqual(['a', 'z']);
  });

  it('is empty without renames', () => {
    expect(slugAliases([{ slug: 'engine' }])).toEqual({});
  });
});

describe('resolveSlug', () => {
  const aliases = { motor: 'engine', 'old-motor': 'motor', a: 'b', b: 'a' };

  it('leaves a current or unknown slug as it is', () => {
    expect(resolveSlug('engine', aliases)).toBe('engine');
    expect(resolveSlug('nope', aliases)).toBe('nope');
    expect(resolveSlug('engine', undefined)).toBe('engine');
  });

  it('follows an alias and a chain of them', () => {
    expect(resolveSlug('motor', aliases)).toBe('engine');
    expect(resolveSlug('old-motor', aliases)).toBe('engine');
  });

  it('stops on a loop', () => {
    expect(['a', 'b']).toContain(resolveSlug('a', aliases));
  });

  it('ignores names inherited from Object', () => {
    expect(resolveSlug('constructor', {})).toBe('constructor');
  });
});

describe('parseSlugAliases', () => {
  it('keeps only slug pairs', () => {
    expect(
      parseSlugAliases({ motor: 'engine', Bad: 'engine', worse: 7, fine: 'not a slug' }),
    ).toEqual({ motor: 'engine' });
  });

  it('reads anything else as no aliases', () => {
    expect(parseSlugAliases(undefined)).toEqual({});
    expect(parseSlugAliases(['motor'])).toEqual({});
    expect(parseSlugAliases('motor')).toEqual({});
  });
});
