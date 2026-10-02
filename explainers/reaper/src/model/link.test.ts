import { describe, expect, it } from 'vitest';
import { HOP_EARTH_GIRTHS, HOP_KM, HOP_S, ROUND_TRIP_S } from './link';

describe('satellite link', () => {
  it('climbs 35,786 km up and back down on each hop', () => {
    expect(HOP_KM).toBe(71572);
  });

  it('needs about a quarter second a hop and 0.477 s there and back', () => {
    expect(HOP_S).toBeCloseTo(0.239, 3);
    expect(ROUND_TRIP_S).toBeCloseTo(0.477, 3);
  });

  it('runs about 1.8 times around the Earth on one hop', () => {
    expect(HOP_EARTH_GIRTHS).toBeCloseTo(1.786, 3);
  });
});
