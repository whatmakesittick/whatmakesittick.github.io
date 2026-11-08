import { describe, expect, it } from 'vitest';
import { HARPSICHORD, KEY, PLAYED_KEY, UPRIGHT, keyX } from '../../../model';
import { lineUpRegionSpec } from './lineUpRegion';

describe('line-up region', () => {
  it('spans the grand key, the upright strings and the harpsichord key front', () => {
    const { x, y, z } = lineUpRegionSpec(PLAYED_KEY.middle);
    expect(z[0]).toBeLessThan(KEY.frontZ - KEY.length);
    expect(z[1]).toBeGreaterThan(HARPSICHORD.offsetZ);
    expect(y[0]).toBeLessThan(KEY.top - KEY.thickness);
    expect(y[1]).toBeGreaterThan(UPRIGHT.stringTop);
    expect((x[0] + x[1]) / 2).toBeCloseTo(keyX(PLAYED_KEY.middle));
  });
});
