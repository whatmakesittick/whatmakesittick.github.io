import { describe, expect, it } from 'vitest';
import {
  AROMA_FULL,
  MOST_RELEASING,
  NOSE_FULL,
  freeShare,
  mouthAroma,
  noseAroma,
  noseShare,
  orthoAroma,
  peakNoseShare,
  releasedShare,
  volatility,
} from './aroma';
import { FOOD_PROFILES } from './odorants';

const SETTINGS = { profile: FOOD_PROFILES.cherry, servingC: -12, fatPercent: 10 };

describe('aroma release', () => {
  it('releases the most at body temperature', () => {
    expect(volatility(37)).toBe(1);
    expect(volatility(0)).toBeLessThan(volatility(20));
  });

  it('holds more aroma in richer ice cream', () => {
    expect(freeShare('benzaldehyde', 20)).toBeLessThan(freeShare('benzaldehyde', 2));
    expect(AROMA_FULL).toBeCloseTo(0.9, 1);
  });

  it('rises as the bite melts and warms', () => {
    const early = releasedShare(mouthAroma(1, SETTINGS));
    const late = releasedShare(mouthAroma(10, SETTINGS));
    expect(early).toBeLessThan(late);
    expect(releasedShare(mouthAroma(-1, SETTINGS))).toBe(0);
  });

  it('only sniffs before the spoon enters the mouth', () => {
    expect(releasedShare(orthoAroma(-1, SETTINGS))).toBeGreaterThan(0);
    expect(releasedShare(orthoAroma(2, SETTINGS))).toBe(0);
  });

  it('stops all aroma at the nose when pinched', () => {
    expect(noseShare(noseAroma(10, SETTINGS, false))).toBeGreaterThan(0);
    expect(noseShare(noseAroma(10, SETTINGS, true))).toBe(0);
  });

  it('reaches a higher peak with less fat and a warmer serving', () => {
    const base = peakNoseShare(SETTINGS);
    expect(peakNoseShare({ ...SETTINGS, fatPercent: 20 })).toBeLessThan(base);
    expect(peakNoseShare({ ...SETTINGS, servingC: -6 })).toBeGreaterThan(base);
    expect(peakNoseShare(SETTINGS, true)).toBe(0);
  });

  it('scales both shares to the most the model can release', () => {
    expect(peakNoseShare(MOST_RELEASING)).toBeCloseTo(1, 3);
    expect(NOSE_FULL).toBeGreaterThan(AROMA_FULL);
    const melted = mouthAroma(12, MOST_RELEASING);
    expect(releasedShare(melted)).toBeCloseTo(1, 3);
  });

  it('lets a warmer serving raise the peak at every fat level', () => {
    [2, 5, 10, 20].forEach((fatPercent) => {
      const cold = peakNoseShare({ ...SETTINGS, fatPercent, servingC: -14 });
      const warm = peakNoseShare({ ...SETTINGS, fatPercent, servingC: -6 });
      expect(warm).toBeGreaterThan(cold);
      expect(warm).toBeLessThanOrEqual(1);
    });
  });
});
