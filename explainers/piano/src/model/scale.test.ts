import { describe, expect, it } from 'vitest';
import { metresPerSecond, mm, mmPerMs, toMs, toSeconds } from './scale';

describe('scale', () => {
  it('turns millimetres into world metres', () => {
    expect(mm(47)).toBeCloseTo(0.047, 12);
  });

  it('converts between milliseconds and seconds', () => {
    expect(toSeconds(2400)).toBe(2.4);
    expect(toMs(2.4)).toBe(2400);
  });

  it('reads a speed in m/s as the same number of mm per ms', () => {
    expect(mmPerMs(1.65)).toBeCloseTo(1.65, 12);
    expect(metresPerSecond(mmPerMs(5))).toBeCloseTo(5, 12);
  });
});
