import { describe, expect, it } from 'vitest';
import { REGISTER_IDS } from '../../../ids';
import { PLAYED_KEY, cutX } from '../../../model';
import { bassSpot, plateSpot, soundboardSpot, stringSpot, tuningPinSpot } from './labelSpots';
import { stringRegionSpec } from './stringRegion';

function inside([, y, z]: readonly number[], key: number): boolean {
  const region = stringRegionSpec(key);
  const within = ([low, high]: readonly [number, number], value: number) =>
    value >= low && value <= high;
  return within(region.y, y) && within(region.z, z);
}

describe('room label spots', () => {
  it('keeps every spot on the uncut side of the played key', () => {
    REGISTER_IDS.forEach((register) => {
      const key = PLAYED_KEY[register];
      [soundboardSpot(key), plateSpot(key), tuningPinSpot(key)].forEach(([x]) => {
        expect(x).toBeGreaterThan(cutX(key));
      });
    });
  });

  it('frames the depth of the played string and its labels', () => {
    REGISTER_IDS.forEach((register) => {
      const key = PLAYED_KEY[register];
      [stringSpot(key), soundboardSpot(key), plateSpot(key), tuningPinSpot(key)].forEach((spot) => {
        expect(inside(spot, key), `${register} ${spot}`).toBe(true);
      });
    });
  });

  it('points at the wound strings only where the cut leaves some', () => {
    expect(bassSpot(PLAYED_KEY.bass)).not.toBeNull();
    expect(bassSpot(PLAYED_KEY.middle)?.[0]).toBeGreaterThan(cutX(PLAYED_KEY.middle));
    expect(bassSpot(PLAYED_KEY.treble)).toBeNull();
  });
});
