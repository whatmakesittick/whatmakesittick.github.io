import { describe, expect, it } from 'vitest';
import { buildShowExplainerDescription } from '../../server/description.ts';
import { catalogue, slugs, topics } from './helpers.ts';

describe('topics', () => {
  it('takes one non-empty topic per explainer from the catalogue entries', () => {
    expect([...topics.keys()].sort()).toEqual(slugs);
    for (const entry of catalogue.explainers) expect(entry.topic.trim()).not.toBe('');
  });

  it('puts every topic into the show_explainer description, joined by semicolons', () => {
    const description = buildShowExplainerDescription(topics, slugs);
    expect(description).toContain(slugs.map((slug) => topics.get(slug)).join('; '));
  });

  it('falls back to the slug for a slug without a topic', () => {
    expect(buildShowExplainerDescription(new Map(), ['engine'])).toContain('engine');
  });

  it('points to the topic fields when the description is too long', () => {
    const long = new Map(slugs.map((slug) => [slug, 'x'.repeat(200)]));
    expect(() => buildShowExplainerDescription(long, slugs)).toThrow('topic');
  });
});
