import { describe, expect, it } from 'vitest';
import { GBU12 } from '../constants';
import { airfoilLoop } from './airfoilSurface';
import { boundsOf } from './testing';
import { finRing, profileSlice, turnedSlice } from './turned';

describe('turned stores', () => {
  it('slices a profile with interpolated ends', () => {
    const slice = profileSlice(
      [
        [0, 0],
        [1, 1],
        [3, 1],
      ],
      0.5,
      2,
    );
    expect(slice[0]).toEqual([0.5, 0.5]);
    expect(slice[slice.length - 1]).toEqual([2, 1]);
  });

  it('turns a slice nose forward from the given nose position', () => {
    const body = boundsOf(turnedSlice(GBU12, 0, GBU12.length, 2));
    expect(body.max.x).toBeCloseTo(2);
    expect(body.min.x).toBeCloseTo(2 - GBU12.length);
    expect(body.max.y).toBeCloseTo(GBU12.radius, 2);
  });

  it('sets four fins around the body', () => {
    const fins = finRing(GBU12, GBU12.wings, 0, airfoilLoop(6));
    expect(fins.length).toBe(4);
    const reach = Math.max(...fins.map((fin) => boundsOf(fin).max.y));
    expect(reach).toBeGreaterThan(GBU12.radius);
  });
});
