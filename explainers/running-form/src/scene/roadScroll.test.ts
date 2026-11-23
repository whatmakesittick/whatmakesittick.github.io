import { describe, expect, it } from 'vitest';
import { PACE_IDS } from '../ids';
import { strideLengthM, strideTimeS } from '../model/paces';
import { SCROLL_WRAP_M } from '../model/layout';
import { RoadScroll, advanceScroll } from './roadScroll';

describe('road scroll', () => {
  it('advances by the stride length per cycle', () => {
    expect(advanceScroll(0, 500, 2.4)).toBeCloseTo(1.2, 9);
    expect(advanceScroll(0, -500, 2.4)).toBeCloseTo(SCROLL_WRAP_M - 1.2, 9);
  });

  it('wraps at the far strip', () => {
    expect(advanceScroll(SCROLL_WRAP_M - 1, 1000, 3)).toBeCloseTo(2, 9);
  });

  it('moves at the speed of the pace while the cycle plays', () => {
    PACE_IDS.forEach((pace) => {
      const scroll = new RoadScroll();
      scroll.reset(0);
      const dt = strideTimeS(pace, 0) / 1000;
      let value = 0;
      for (let units = 1; units <= 250; units += 1)
        value = scroll.update(units, strideLengthM(pace, 0));
      const speed = value / (250 * dt);
      expect(speed).toBeCloseTo({ easy: 2.5, steady: 3.5, fast: 4.5 }[pace], 6);
    });
  });

  it('follows the scrubber through the wrap of the cycle', () => {
    const scroll = new RoadScroll();
    scroll.reset(990);
    const value = scroll.update(10, 2.4);
    expect(value).toBeCloseTo(0.048, 9);
  });

  it('runs backward when the scrubber does', () => {
    const scroll = new RoadScroll();
    scroll.reset(100, 10);
    expect(scroll.update(50, 2)).toBeCloseTo(10 - 0.1, 9);
  });

  it('does not jump when the pace or the step rate changes under a still scrubber', () => {
    const scroll = new RoadScroll();
    scroll.reset(300, 50);
    const before = scroll.update(300, strideLengthM('steady', 0));
    const afterPace = scroll.update(300, strideLengthM('fast', 0));
    const afterRate = scroll.update(300, strideLengthM('fast', 10));
    expect(afterPace).toBe(before);
    expect(afterRate).toBe(before);
  });

  it('uses the new stride length for the distance after the change', () => {
    const scroll = new RoadScroll();
    scroll.reset(0);
    scroll.update(100, strideLengthM('easy', 0));
    const before = scroll.update(100, strideLengthM('fast', 0));
    const after = scroll.update(200, strideLengthM('fast', 0));
    expect(after - before).toBeCloseTo(strideLengthM('fast', 0) * 0.1, 9);
  });
});
