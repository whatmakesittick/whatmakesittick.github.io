import { describe, expect, it } from 'vitest';
import { KMH_PER_MS, metres, mm, toKmh, toMs } from './scale';

describe('scale', () => {
  it('draws one world unit as one metre', () => {
    expect(metres(24.8)).toBe(24.8);
  });

  it('turns the 10 mm gap into a hundredth of a metre', () => {
    expect(mm(10)).toBeCloseTo(0.01, 12);
    expect(mm(150)).toBeCloseTo(0.15, 12);
  });

  it('converts between metres per second and km/h both ways', () => {
    expect(KMH_PER_MS).toBe(3.6);
    expect(toMs(430)).toBeCloseTo(119.444, 3);
    expect(toKmh(toMs(300))).toBeCloseTo(300, 9);
  });
});
