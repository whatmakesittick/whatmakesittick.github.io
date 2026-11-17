import { describe, expect, it } from 'vitest';
import {
  AROMA_FULL,
  freeShare,
  levelShare,
  mouthAroma,
  noseAroma,
  orthoAroma,
  peakNoseShare,
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
    const early = levelShare(mouthAroma(1, SETTINGS));
    const late = levelShare(mouthAroma(10, SETTINGS));
    expect(early).toBeLessThan(late);
    expect(levelShare(mouthAroma(-1, SETTINGS))).toBe(0);
  });

  it('only sniffs before the spoon enters the mouth', () => {
    expect(levelShare(orthoAroma(-1, SETTINGS))).toBeGreaterThan(0);
    expect(levelShare(orthoAroma(2, SETTINGS))).toBe(0);
  });

  it('stops all aroma at the nose when pinched', () => {
    expect(levelShare(noseAroma(10, SETTINGS, false))).toBeGreaterThan(0);
    expect(levelShare(noseAroma(10, SETTINGS, true))).toBe(0);
  });

  it('reaches a higher peak with less fat and a warmer serving', () => {
    const base = peakNoseShare(SETTINGS);
    expect(peakNoseShare({ ...SETTINGS, fatPercent: 20 })).toBeLessThan(base);
    expect(peakNoseShare({ ...SETTINGS, servingC: -6 })).toBeGreaterThan(base);
    expect(peakNoseShare(SETTINGS, true)).toBe(0);
  });
});
