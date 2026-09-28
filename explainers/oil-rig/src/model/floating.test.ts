import { describe, expect, it } from 'vitest';
import {
  DRILLING_DRAFT_M,
  TRANSIT_DRAFT_M,
  airGapM,
  displacementT,
  keelWaveMotion,
  rigsFor,
  waveMotionShare,
  wavelengthM,
} from './floating';

describe('the floating rig', () => {
  it('pushes aside about 51,000 t drilling and 37,000 t in transit', () => {
    expect(displacementT(DRILLING_DRAFT_M)).toBeCloseTo(51000, -3);
    expect(displacementT(TRANSIT_DRAFT_M)).toBeCloseTo(37000, -3);
  });

  it('keeps the deck clear of the waves', () => {
    expect(airGapM(DRILLING_DRAFT_M)).toBe(12);
    expect(airGapM(TRANSIT_DRAFT_M)).toBeGreaterThan(airGapM(DRILLING_DRAFT_M));
  });

  it('feels about 43 percent of a 10 s swell at drilling draft and 68 percent in transit', () => {
    expect(keelWaveMotion(DRILLING_DRAFT_M)).toBeCloseTo(0.43, 2);
    expect(keelWaveMotion(TRANSIT_DRAFT_M)).toBeCloseTo(0.68, 2);
  });

  it('leaves about 4 percent of the wave motion half a wavelength down', () => {
    const period = 8;
    expect(waveMotionShare(wavelengthM(period) / 2, period)).toBeCloseTo(0.043, 3);
  });
});

describe('rigs for each water depth', () => {
  it('stands jack-ups and jackets on the seabed in shallow water', () => {
    expect(rigsFor(100)).toEqual(['jackUp', 'jacket', 'tlp', 'spar', 'semi', 'drillship']);
    expect(rigsFor(300)).not.toContain('jackUp');
  });

  it('floats in deep water and leaves the deepest to drillships', () => {
    expect(rigsFor(1000)).toEqual(['tlp', 'spar', 'semi', 'drillship']);
    expect(rigsFor(3500)).toEqual(['drillship']);
  });

  it('keeps floating rigs out of water shallower than their draft', () => {
    expect(rigsFor(10)).toEqual(['jackUp', 'jacket']);
  });
});
