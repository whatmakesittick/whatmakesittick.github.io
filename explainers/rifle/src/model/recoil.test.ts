import { describe, expect, it } from 'vitest';
import { BULLET_MOMENTUM, GAS_MOMENTUM, GAS_SHARE, RECOIL_SPEED } from './recoil';

describe('recoil', () => {
  it('pushes the rifle back at about 2 m/s', () => {
    expect(BULLET_MOMENTUM).toBeCloseTo(5.65, 2);
    expect(GAS_MOMENTUM).toBeCloseTo(2.56, 2);
    expect(RECOIL_SPEED).toBeCloseTo(2.28, 2);
  });

  it('gets a quarter to a third of the kick from the gas', () => {
    expect(GAS_SHARE).toBeGreaterThan(0.25);
    expect(GAS_SHARE).toBeLessThan(1 / 3);
  });
});
