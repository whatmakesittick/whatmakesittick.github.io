import { describe, expect, it } from 'vitest';
import { BLACK_HOLES } from './blackHoles';
import { SGR_A_MASS_KG } from './constants';
import { CENTRE_TIME } from './fall';
import { ONE_G_RADIUS, tidalStretchG } from './tides';

describe('tides and other black holes', () => {
  it('barely stretches a body at the horizon of Sagittarius A*', () => {
    expect(tidalStretchG(1, SGR_A_MASS_KG)).toBeCloseTo(1.14e-4, 6);
    expect(ONE_G_RADIUS).toBeCloseTo(0.048, 3);
  });

  it('compares the three holes', () => {
    expect(BLACK_HOLES.sgrA.rsKm).toBeCloseTo(1.269e7, -4);
    expect(BLACK_HOLES.sgrA.fallSecondsFrom5Rs).toBeCloseTo(CENTRE_TIME, 5);
    expect(BLACK_HOLES.m87.rsKm).toBeCloseTo(1.92e10, -8);
    expect(BLACK_HOLES.m87.fallSecondsFrom5Rs / 86_400).toBeCloseTo(13, 0);
    expect(BLACK_HOLES.stellar.rsKm).toBeCloseTo(62, 0);
    expect(BLACK_HOLES.stellar.fallSecondsFrom5Rs).toBeCloseTo(0.0036, 4);
    expect(BLACK_HOLES.stellar.horizonTideG / 1e6).toBeCloseTo(4.8, 1);
    expect(BLACK_HOLES.m87.horizonTideG).toBeLessThan(1e-10);
  });
});
