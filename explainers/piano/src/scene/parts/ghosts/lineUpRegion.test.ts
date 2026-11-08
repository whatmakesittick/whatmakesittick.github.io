import { describe, expect, it } from 'vitest';
import { HARPSICHORD, KEY, PLAYED_KEY, UPRIGHT, keyX } from '../../../model';
import { JACK } from './harpsichordLayout';
import { lineUpRegionSpec } from './lineUpRegion';
import { HEAD_Y, KEY_BACK } from './uprightLayout';

const KEY_BOTTOM = KEY.top - KEY.thickness;

describe('line-up region', () => {
  it('spans the grand key, the upright strings and the harpsichord key front', () => {
    const { x, y, z } = lineUpRegionSpec(PLAYED_KEY.middle, 'grand');
    expect(z[0]).toBeLessThan(KEY.frontZ - KEY.length);
    expect(z[1]).toBeGreaterThan(HARPSICHORD.offsetZ);
    expect(y[0]).toBeLessThan(KEY_BOTTOM);
    expect(y[1]).toBeGreaterThan(UPRIGHT.stringTop);
    expect((x[0] + x[1]) / 2).toBeCloseTo(keyX(PLAYED_KEY.middle));
  });

  it('closes in on the upright from its strings to its key front, hammer head included', () => {
    const { y, z } = lineUpRegionSpec(PLAYED_KEY.middle, 'upright');
    expect(z[0]).toBeLessThan(UPRIGHT.stringZ);
    expect(z[0]).toBeGreaterThan(KEY.frontZ);
    expect(z[1]).toBeGreaterThan(UPRIGHT.offsetZ);
    expect(z[1]).toBeLessThan(HARPSICHORD.offsetZ - HARPSICHORD.keyLength);
    expect(y[0]).toBeLessThan(KEY_BOTTOM);
    expect(y[1]).toBeGreaterThan(HEAD_Y);
    expect(KEY_BACK).toBeGreaterThan(z[0]);
  });

  it('closes in on the harpsichord key and its jack', () => {
    const { y, z } = lineUpRegionSpec(PLAYED_KEY.middle, 'harpsichord');
    expect(z[0]).toBeLessThan(HARPSICHORD.offsetZ - HARPSICHORD.keyLength);
    expect(z[0]).toBeGreaterThan(UPRIGHT.stringZ);
    expect(z[1]).toBeGreaterThan(HARPSICHORD.offsetZ);
    expect(y[0]).toBeLessThan(KEY_BOTTOM);
    expect(y[1]).toBeGreaterThan(JACK.top);
  });
});
