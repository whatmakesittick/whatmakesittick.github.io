import { describe, expect, it } from 'vitest';
import { BAND_GAP_NM, photonEnergyEv } from './optics';
import {
  belowGapShare,
  keptShareOfPhoton,
  pairsPerSecondPerHalfCell,
  thermalisedShare,
  usableShare,
} from './spectrum';

describe('spectrum shares', () => {
  it('splits sunlight into usable, too weak and lost as heat (facts section 3)', () => {
    expect(belowGapShare()).toBeCloseTo(0.19, 2);
    expect(thermalisedShare()).toBeCloseTo(0.32, 2);
    expect(usableShare() + belowGapShare() + thermalisedShare()).toBeCloseTo(1, 2);
  });

  it('keeps the band gap out of each photon and nothing past the gap', () => {
    expect(keptShareOfPhoton(600) * photonEnergyEv(600)).toBeCloseTo(1.12, 2);
    expect(keptShareOfPhoton(BAND_GAP_NM - 1)).toBeCloseTo(1, 2);
    expect(keptShareOfPhoton(1200)).toBe(0);
  });

  it('frees about 4 × 10¹⁹ electrons a second in one half cell in full sun (facts section 3)', () => {
    expect(pairsPerSecondPerHalfCell(1000)).toBeCloseTo(4.39e19, -17);
    expect(pairsPerSecondPerHalfCell(500)).toBeCloseTo(2.19e19, -17);
    expect(pairsPerSecondPerHalfCell(0)).toBe(0);
  });
});
