import { describe, expect, it } from 'vitest';
import { DRONE_SCALE, droneUnits, toKmh, toMetresPerSecond } from './scale';

describe('scale', () => {
  it('draws the drone ten times larger than the ground', () => {
    expect(DRONE_SCALE).toBe(10);
    expect(droneUnits(0.34)).toBeCloseTo(3.4, 9);
  });

  it('converts speeds between metres per second and km/h', () => {
    expect(toKmh(20)).toBeCloseTo(72, 9);
    expect(toMetresPerSecond(72)).toBeCloseTo(20, 9);
  });
});
