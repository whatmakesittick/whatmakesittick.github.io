import { describe, expect, it } from 'vitest';
import { NEAR_STRIP_M, PATTERN_PERIODS_M, SCROLL_WRAP_M } from '../../../model/layout';
import { NEAR_WINDOW, copiesOf, edgeFade, windowX, wrapInto } from './strip';

const EPSILON_M = 0.01;

describe('scrolling strip', () => {
  it('covers the window with whole copies of the near strip', () => {
    expect(copiesOf(NEAR_WINDOW) * NEAR_STRIP_M).toBe(NEAR_WINDOW.behindM + NEAR_WINDOW.aheadM);
    Object.values(PATTERN_PERIODS_M).forEach((period) => expect(NEAR_STRIP_M % period).toBe(0));
  });

  it('places an item the same just before and after the scroll wraps', () => {
    [0, 37.5, 120, 239].forEach((stripX) => {
      const before = windowX(stripX, SCROLL_WRAP_M - EPSILON_M, NEAR_WINDOW);
      const after = windowX(
        stripX,
        wrapInto(SCROLL_WRAP_M + EPSILON_M, SCROLL_WRAP_M),
        NEAR_WINDOW,
      );
      expect(after - before).toBeCloseTo(-2 * EPSILON_M, 6);
    });
  });

  it('moves items backward as the road scrolls and keeps them in the window', () => {
    expect(windowX(50, 10, NEAR_WINDOW)).toBe(40);
    for (let scroll = 0; scroll < SCROLL_WRAP_M; scroll += 97) {
      const x = windowX(13, scroll, NEAR_WINDOW);
      expect(x).toBeGreaterThanOrEqual(-NEAR_WINDOW.behindM);
      expect(x).toBeLessThan(NEAR_WINDOW.aheadM);
    }
  });

  it('shrinks items only near the ends of the window', () => {
    expect(edgeFade(0, NEAR_WINDOW)).toBe(1);
    expect(edgeFade(-NEAR_WINDOW.behindM, NEAR_WINDOW)).toBe(0);
    expect(edgeFade(NEAR_WINDOW.aheadM, NEAR_WINDOW)).toBe(0);
  });
});
