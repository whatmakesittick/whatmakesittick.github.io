import { describe, expect, it } from 'vitest';
import {
  AV_VALVES_CLOSE_MS,
  BEAT_MS,
  RESTING_RATE_PER_MINUTE,
  SEMILUNAR_CLOSE_MS,
  STROKE_ML,
} from './cycle';
import {
  FITNESS_IDS,
  FITNESS_PROFILES,
  REST_SYSTOLE_MS,
  beatLength,
  cardiacOutput,
  diastoleLength,
  heartRate,
  roundTripSeconds,
  strokeVolume,
  systoleLength,
} from './exercise';

const TYPICAL = FITNESS_PROFILES.typical;
const ATHLETE = FITNESS_PROFILES.athlete;

describe('exercise', () => {
  it('rests the typical heart at the beat of the cycle model', () => {
    expect(TYPICAL.restRate).toBe(RESTING_RATE_PER_MINUTE);
    expect(TYPICAL.restStroke).toBe(STROKE_ML);
    expect(beatLength(TYPICAL.restRate)).toBe(BEAT_MS);
  });

  it('climbs in a straight line from the resting to the top heart rate', () => {
    FITNESS_IDS.forEach((fitness) => {
      const { restRate, maxRate } = FITNESS_PROFILES[fitness];
      expect(heartRate(0, fitness)).toBe(restRate);
      expect(heartRate(1, fitness)).toBe(maxRate);
      expect(heartRate(0.5, fitness)).toBeCloseTo((restRate + maxRate) / 2);
    });
  });

  it('raises the stroke early and holds it from half effort', () => {
    FITNESS_IDS.forEach((fitness) => {
      const { restStroke, maxStroke } = FITNESS_PROFILES[fitness];
      expect(strokeVolume(0, fitness)).toBe(restStroke);
      expect(strokeVolume(0.25, fitness)).toBeCloseTo(restStroke + 0.75 * (maxStroke - restStroke));
      expect(strokeVolume(0.5, fitness)).toBe(maxStroke);
      expect(strokeVolume(1, fitness)).toBe(maxStroke);
    });
  });

  it('moves about 5 litres a minute at rest in both hearts', () => {
    expect(cardiacOutput(0, 'typical')).toBeCloseTo(5.25);
    expect(cardiacOutput(0, 'athlete')).toBeCloseTo(5);
  });

  it('reaches about 21 litres a minute flat out, and about 28 in the athlete', () => {
    expect(cardiacOutput(1, 'typical')).toBeCloseTo(20.9);
    expect(cardiacOutput(1, 'athlete')).toBeCloseTo(27.75);
    expect(ATHLETE.maxStroke).toBeGreaterThan(TYPICAL.maxStroke);
    expect(ATHLETE.maxRate).toBeLessThanOrEqual(TYPICAL.maxRate);
  });

  it('gives the resting athlete about 790 ms to fill each beat', () => {
    expect(diastoleLength(ATHLETE.restRate)).toBeCloseTo(796, 0);
  });

  it('gives the typical heart about a tenth of a second to fill each beat flat out', () => {
    expect(Math.round(diastoleLength(TYPICAL.maxRate))).toBe(108);
  });

  it('squeezes from S1 to S2 and fills for the rest of the resting beat', () => {
    expect(REST_SYSTOLE_MS).toBe(SEMILUNAR_CLOSE_MS - AV_VALVES_CLOSE_MS);
    expect(systoleLength(TYPICAL.restRate)).toBeCloseTo(REST_SYSTOLE_MS);
    expect(diastoleLength(TYPICAL.restRate)).toBeCloseTo(BEAT_MS - REST_SYSTOLE_MS);
  });

  it('keeps most of the squeeze and loses most of the filling time flat out', () => {
    const squeeze = systoleLength(TYPICAL.maxRate);
    const filling = diastoleLength(TYPICAL.maxRate);
    expect(squeeze / REST_SYSTOLE_MS).toBeCloseTo(Math.sqrt(beatLength(TYPICAL.maxRate) / BEAT_MS));
    expect(filling).toBeLessThan(squeeze);
    expect(filling / (BEAT_MS - REST_SYSTOLE_MS)).toBeLessThan(0.3);
  });

  it('sends a drop round the body in about a minute at rest', () => {
    expect(roundTripSeconds(cardiacOutput(0, 'typical'))).toBeCloseTo(57.1, 1);
    expect(roundTripSeconds(cardiacOutput(1, 'typical'))).toBeCloseTo(14.4, 1);
  });
});
