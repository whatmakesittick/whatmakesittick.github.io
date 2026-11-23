import { describe, expect, it } from 'vitest';
import { CLOTH, COVER_ONSET_SHARE, cover } from './cloth';

const STEPS = 20;
const BEYOND_M = 0.05;
const ONSET_M = -CLOTH.edgeM * COVER_ONSET_SHARE;

describe('cloth cover', () => {
  it('is zero at the hem', () => {
    expect(cover(ONSET_M)).toBe(0);
    expect(cover(ONSET_M - BEYOND_M)).toBe(0);
  });

  it('is full away from the hem', () => {
    expect(cover(CLOTH.edgeM)).toBe(1);
    expect(cover(CLOTH.edgeM + BEYOND_M)).toBe(1);
  });

  it('rises steadily between the two', () => {
    const span = CLOTH.edgeM - ONSET_M;
    const samples = Array.from({ length: STEPS + 1 }, (_, i) =>
      cover(ONSET_M + (span * i) / STEPS),
    );
    samples.slice(1).forEach((value, i) => expect(value).toBeGreaterThanOrEqual(samples[i]));
    expect(samples[STEPS / 2]).toBeGreaterThan(0);
    expect(samples[STEPS / 2]).toBeLessThan(1);
  });
});
