import { describe, expect, it } from 'vitest';
import { CloseUp, closeUpFactor } from './closeUp';
import { CLOSE_UP } from './dims';

const MIDWAY = (CLOSE_UP.nearM + CLOSE_UP.farM) / 2;

describe('close-up factor', () => {
  it('keeps full size at and beyond the far distance', () => {
    expect(closeUpFactor(CLOSE_UP.farM)).toBe(1);
    expect(closeUpFactor(CLOSE_UP.farM * 4)).toBe(1);
  });

  it('rests on the floor at and inside the close-up distance', () => {
    expect(closeUpFactor(CLOSE_UP.nearM)).toBe(CLOSE_UP.floor);
    expect(closeUpFactor(0)).toBe(CLOSE_UP.floor);
  });

  it('falls steadily in between', () => {
    expect(closeUpFactor(MIDWAY)).toBeCloseTo((CLOSE_UP.floor + 1) / 2, 9);
    expect(closeUpFactor(CLOSE_UP.nearM + 0.5)).toBeLessThan(closeUpFactor(CLOSE_UP.farM - 0.5));
  });

  it('reports a change only when the factor moves', () => {
    const closeUp = new CloseUp();
    expect(closeUp.follow(CLOSE_UP.farM)).toBe(false);
    expect(closeUp.follow(CLOSE_UP.nearM)).toBe(true);
    expect(closeUp.factor).toBe(CLOSE_UP.floor);
    expect(closeUp.follow(CLOSE_UP.nearM)).toBe(false);
  });
});
