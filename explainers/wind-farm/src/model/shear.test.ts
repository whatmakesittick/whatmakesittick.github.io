import { describe, expect, it } from 'vitest';
import { HUB_HEIGHT_M, TIP_HEIGHT_M } from './constants';
import { SHEAR_HEIGHTS_M } from './layout';
import { windAtHeight } from './shear';

describe('windAtHeight', () => {
  it('keeps the hub wind at hub height', () => {
    expect(windAtHeight(10, HUB_HEIGHT_M)).toBe(10);
  });

  it('blows about 10.8 m/s at the tip and 8.4 m/s at 30 m for 10 m/s at the hub', () => {
    expect(windAtHeight(10, TIP_HEIGHT_M)).toBeCloseTo(10.8, 1);
    expect(windAtHeight(10, 30)).toBeCloseTo(8.4, 1);
  });

  it('grows with height up the shear profile', () => {
    const winds = SHEAR_HEIGHTS_M.map((height) => windAtHeight(10, height));
    winds.slice(1).forEach((wind, index) => expect(wind).toBeGreaterThan(winds[index]));
  });

  it('stays calm when the hub is calm', () => {
    expect(windAtHeight(0, TIP_HEIGHT_M)).toBe(0);
  });
});
