import { describe, expect, it } from 'vitest';
import { buildShowExplainerDescription, validateTopics } from '../../server/description.ts';
import { slugs, topics } from './helpers.ts';

describe('topics', () => {
  it('names one topic per explainer', () => {
    expect(Object.keys(topics).sort()).toEqual(slugs);
    for (const slug of slugs) expect(typeof topics[slug]).toBe('string');
  });

  it('puts every topic into the show_explainer description, joined by semicolons', () => {
    const description = buildShowExplainerDescription(topics, slugs);
    expect(description).toContain(slugs.map((slug) => topics[slug]).join('; '));
  });

  it('accepts a topic string for every slug', () => {
    expect(validateTopics({ engine: 'car engine' }, ['engine'])).toEqual({ engine: 'car engine' });
  });

  it('rejects a list of words, an empty topic, a missing slug and an unknown slug', () => {
    expect(() => validateTopics({ engine: ['car engine'] }, ['engine'])).toThrow('"engine"');
    expect(() => validateTopics({ engine: ' ' }, ['engine'])).toThrow('"engine"');
    expect(() => validateTopics({}, ['engine'])).toThrow('"engine"');
    expect(() => validateTopics({ engine: 'car engine', boat: 'boat' }, ['engine'])).toThrow(
      'boat',
    );
  });
});
