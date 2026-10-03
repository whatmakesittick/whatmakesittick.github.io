import { describe, expect, it } from 'vitest';
import { GROUND_STATION, SHIP, SLIPWAY } from '../../../model/layout';
import { shipHalfBreadth } from './ship';
import { shoreHeight, slabTop } from './shore';

describe('world shapes', () => {
  it('runs the slipway from its top down to its foot', () => {
    expect(slabTop(SLIPWAY.x[0])).toBeCloseTo(SLIPWAY.top, 9);
    expect(slabTop(SLIPWAY.x[1])).toBeCloseTo(SLIPWAY.foot, 9);
  });

  it('keeps the shore under the slab, flat under the station and below water out at sea', () => {
    const x = (SLIPWAY.x[0] + SLIPWAY.x[1]) / 2;
    expect(shoreHeight(x, 0)).toBeLessThan(slabTop(x));
    expect(shoreHeight(GROUND_STATION[0], GROUND_STATION[2])).toBeCloseTo(GROUND_STATION[1], 6);
    expect(shoreHeight(40, 0)).toBeLessThan(0);
    expect(shoreHeight(-60, 30)).toBeGreaterThan(1);
  });

  it('gives the ship its waterline beam amidships and a fine stem', () => {
    expect(shipHalfBreadth(0, 0)).toBeCloseTo(SHIP.beam / 2, 6);
    expect(shipHalfBreadth(0, -SHIP.draft)).toBeCloseTo(0, 6);
    expect(shipHalfBreadth(SHIP.length / 2, 1)).toBeLessThan(0.5);
  });
});
