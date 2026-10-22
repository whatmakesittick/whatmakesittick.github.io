import { describe, expect, it } from 'vitest';
import { NUDGE_IDS } from '../ids';
import { GAP_BAND_MM, GAP_MM } from './constants';
import { NUDGE_PEAK_MM, NUDGE_SETTLE_SECONDS, nudgeResponse } from './nudge';

const SAMPLE_STEP_SECONDS = 1e-3;
const EARLY_SWING_SECONDS = 0.05;
const NEAR_PEAK_MM = 1.9;
const FIRST_HALF_SECONDS = 0.4;
const LATE_SPAN_START_SECONDS = NUDGE_SETTLE_SECONDS / 2;
const QUIET_TIMES = [-1, -SAMPLE_STEP_SECONDS, NUDGE_SETTLE_SECONDS, NUDGE_SETTLE_SECONDS + 2];

const SAMPLES = Array.from(
  { length: Math.round(NUDGE_SETTLE_SECONDS / SAMPLE_STEP_SECONDS) },
  (_, index) => index * SAMPLE_STEP_SECONDS,
);

function largestSwing(from: number, to: number): number {
  return Math.max(
    ...SAMPLES.filter((seconds) => seconds >= from && seconds < to).map((seconds) =>
      Math.abs(nudgeResponse(seconds, 'bump').verticalMm),
    ),
  );
}

describe('nudgeResponse', () => {
  it('peaks at 2 mm and settles in 1.5 s', () => {
    expect(NUDGE_PEAK_MM).toBe(2);
    expect(NUDGE_SETTLE_SECONDS).toBe(1.5);
  });

  it('keeps the gap inside the 8 to 12 mm band', () => {
    expect(GAP_MM - NUDGE_PEAK_MM).toBeGreaterThanOrEqual(GAP_BAND_MM.min);
    expect(GAP_MM + NUDGE_PEAK_MM).toBeLessThanOrEqual(GAP_BAND_MM.max);
  });

  it.each(NUDGE_IDS)('is exactly zero before the %s and once it has settled', (id) => {
    [...QUIET_TIMES, 0].forEach((seconds) => {
      expect(nudgeResponse(seconds, id)).toEqual({ verticalMm: 0, lateralMm: 0 });
    });
  });

  it.each(NUDGE_IDS)('never swings past 2 mm after a %s', (id) => {
    SAMPLES.forEach((seconds) => {
      const { verticalMm, lateralMm } = nudgeResponse(seconds, id);
      expect(Math.abs(verticalMm)).toBeLessThanOrEqual(NUDGE_PEAK_MM);
      expect(Math.abs(lateralMm)).toBeLessThanOrEqual(NUDGE_PEAK_MM);
    });
  });

  it('swings close to the full 2 mm first, then dies away', () => {
    expect(largestSwing(0, FIRST_HALF_SECONDS)).toBeGreaterThan(NEAR_PEAK_MM);
    expect(largestSwing(LATE_SPAN_START_SECONDS, NUDGE_SETTLE_SECONDS)).toBeLessThan(
      largestSwing(0, FIRST_HALF_SECONDS) / 2,
    );
  });

  it('moves only the levitation gap after a bump', () => {
    SAMPLES.forEach((seconds) => {
      expect(nudgeResponse(seconds, 'bump').lateralMm).toBe(0);
    });
    expect(nudgeResponse(EARLY_SWING_SECONDS, 'bump').verticalMm).not.toBe(0);
  });

  it('moves only the guidance gaps after a gust, first toward the right side', () => {
    SAMPLES.forEach((seconds) => {
      expect(nudgeResponse(seconds, 'gust').verticalMm).toBe(0);
    });
    expect(nudgeResponse(EARLY_SWING_SECONDS, 'gust').lateralMm).toBeGreaterThan(0);
  });
});
