import { describe, expect, it } from 'vitest';
import { COLLECTIVE_RANGE, clampCollective, verticalTendency } from './flight';

describe('clampCollective', () => {
  it('keeps the lever within its travel', () => {
    expect(clampCollective(-0.2)).toBe(COLLECTIVE_RANGE.min);
    expect(clampCollective(1.4)).toBe(COLLECTIVE_RANGE.max);
    expect(clampCollective(0.3)).toBe(0.3);
  });
});

describe('verticalTendency', () => {
  it('hovers around the middle of the travel', () => {
    expect(verticalTendency(COLLECTIVE_RANGE.hover)).toBe('hover');
  });

  it('descends with the lever down and climbs with it up', () => {
    expect(verticalTendency(COLLECTIVE_RANGE.min)).toBe('descend');
    expect(verticalTendency(COLLECTIVE_RANGE.max)).toBe('climb');
  });
});
