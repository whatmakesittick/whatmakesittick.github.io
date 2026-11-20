import { describe, expect, it } from 'vitest';
import { coldness, presence, sweetness, tasteAt } from './taste';

describe('taste', () => {
  it('tastes nothing before the bite', () => {
    expect(presence(-1)).toBe(0);
    expect(tasteAt(-1, -12, 'cherry')).toEqual({ sweet: 0, sour: 0, cold: 0 });
  });

  it('dulls sweetness below about 12 °C', () => {
    expect(sweetness(0)).toBe(0.6);
    expect(sweetness(20)).toBe(1);
  });

  it('feels the cold while the bite is frozen', () => {
    expect(coldness(-12)).toBeCloseTo(0.94, 2);
    expect(coldness(30)).toBe(0);
  });

  it('adds a little sour only for the fruit', () => {
    expect(tasteAt(3, -12, 'cherry').sour).toBeCloseTo(0.35, 6);
    expect(tasteAt(3, -12, 'sweets').sour).toBe(0);
  });

  it('fades after the swallow', () => {
    expect(tasteAt(16, -12, 'cherry').sweet).toBeLessThan(tasteAt(11, -12, 'cherry').sweet);
  });
});
