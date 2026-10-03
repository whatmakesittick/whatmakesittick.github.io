import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { WIND_STREAKS } from '../../constants';
import { streakSeeds, windFlow, windStrength } from './windStreaks';

describe('wind streaks', () => {
  it('shows only at cruise speeds and only while armed', () => {
    expect(windStrength({ speedKmh: 30, armed: true })).toBe(0);
    expect(windStrength({ speedKmh: WIND_STREAKS.speedKmh.from, armed: true })).toBe(0);
    expect(windStrength({ speedKmh: 70, armed: true })).toBe(1);
    expect(windStrength({ speedKmh: 70, armed: false })).toBe(0);
    const orbit = windStrength({ speedKmh: 54, armed: true });
    expect(orbit).toBeGreaterThan(0);
    expect(orbit).toBeLessThan(0.5);
  });

  it('lines the streaks up with the flight path', () => {
    const flow = windFlow(
      { heading: Math.PI / 2, speedKmh: 70, verticalSpeed: 0, armed: true },
      new Vector3(),
    );
    expect(flow.z).toBeCloseTo(1);
    expect(flow.length()).toBeCloseTo(1);
  });

  it('scatters the streaks over the whole box the same way every time', () => {
    const seeds = streakSeeds(WIND_STREAKS.count, WIND_STREAKS.seed);
    expect(seeds).toEqual(streakSeeds(WIND_STREAKS.count, WIND_STREAKS.seed));
    expect(Math.min(...seeds)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...seeds)).toBeLessThan(1);
    const heights = seeds.filter((_, index) => index % 3 === 1);
    expect(heights.filter((height) => height < 0.5).length).toBeGreaterThan(heights.length / 4);
    expect(heights.filter((height) => height >= 0.5).length).toBeGreaterThan(heights.length / 4);
  });
});
