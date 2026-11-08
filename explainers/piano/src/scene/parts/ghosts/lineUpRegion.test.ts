import { describe, expect, it } from 'vitest';
import { HARPSICHORD, KEY, PLAYED_KEY, UPRIGHT, keyX } from '../../../model';
import { HARPSICHORD_BACK, JACK, STRING, stringPoint } from './harpsichordLayout';
import { lineUpRegionSpec } from './lineUpRegion';
import { CAPSTAN, HEAD_Y, KEY_BACK } from './uprightLayout';
import { PANEL_BACK } from './uprightPanel';

const KEY_BOTTOM = KEY.top - KEY.thickness;

describe('line-up region', () => {
  it('packs the three mechanisms front to back without overlap, upright strings behind its key', () => {
    expect(PANEL_BACK).toBeGreaterThan(KEY.frontZ);
    expect(UPRIGHT.stringZ).toBeLessThan(KEY_BACK);
    expect(HARPSICHORD_BACK).toBeGreaterThan(UPRIGHT.offsetZ);
  });

  it('spans the grand key, the upright strings and the harpsichord key front', () => {
    const { x, y, z } = lineUpRegionSpec(PLAYED_KEY.middle, 'grand');
    expect(z[0]).toBeLessThan(KEY.frontZ - KEY.length);
    expect(z[1]).toBeGreaterThan(HARPSICHORD.offsetZ);
    expect(y[0]).toBeLessThan(KEY_BOTTOM);
    expect(y[1]).toBeGreaterThan(UPRIGHT.stringTop);
    expect((x[0] + x[1]) / 2).toBeCloseTo(keyX(PLAYED_KEY.middle));
  });

  it('closes in on the upright action from its strings, hammer head included', () => {
    const { y, z } = lineUpRegionSpec(PLAYED_KEY.middle, 'upright');
    expect(z[0]).toBeLessThan(UPRIGHT.stringZ);
    expect(z[0]).toBeGreaterThan(KEY.frontZ);
    expect(z[1]).toBeGreaterThan(CAPSTAN.z);
    expect(z[1]).toBeLessThan(UPRIGHT.offsetZ);
    expect(y[0]).toBeLessThan(KEY_BOTTOM);
    expect(y[1]).toBeGreaterThan(HEAD_Y);
    expect(KEY_BACK).toBeGreaterThan(z[0]);
  });

  it('closes in on the harpsichord jack and the string it plucks', () => {
    const { y, z } = lineUpRegionSpec(PLAYED_KEY.middle, 'harpsichord');
    expect(z[0]).toBeLessThan(HARPSICHORD_BACK);
    expect(z[0]).toBeGreaterThan(UPRIGHT.stringZ);
    expect(z[1]).toBeGreaterThan(stringPoint(STRING.reach[1])[2]);
    expect(z[1]).toBeLessThan(HARPSICHORD.offsetZ);
    expect(y[0]).toBeLessThan(KEY_BOTTOM);
    expect(y[1]).toBeGreaterThan(JACK.top);
  });
});
