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
      expect(heartRate(fitness, 0)).toBe(restRate);
      expect(heartRate(fitness, 1)).toBe(maxRate);
      expect(heartRate(fitness, 0.5)).toBeCloseTo((restRate + maxRate) / 2);
    });
  });

  it('raises the stroke early and holds it from half effort', () => {
    FITNESS_IDS.forEach((fitness) => {
      const { restStroke, maxStroke } = FITNESS_PROFILES[fitness];
      expect(strokeVolume(fitness, 0)).toBe(restStroke);
      expect(strokeVolume(fitness, 0.25)).toBeCloseTo(restStroke + 0.75 * (maxStroke - restStroke));
      expect(strokeVolume(fitness, 0.5)).toBe(maxStroke);
      expect(strokeVolume(fitness, 1)).toBe(maxStroke);
    });
  });

  it('moves about 5 litres a minute at rest in both hearts', () => {
    expect(cardiacOutput('typical', 0)).toBeCloseTo(5.25);
    expect(cardiacOutput('athlete', 0)).toBeCloseTo(5.25);
  });

  it('reaches about 20 litres a minute flat out, and about 30 in the athlete', () => {
    expect(cardiacOutput('typical', 1)).toBeCloseTo(19.95);
    expect(cardiacOutput('athlete', 1)).toBeCloseTo(32.3);
    expect(ATHLETE.maxStroke).toBeGreaterThan(TYPICAL.maxStroke);
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
    expect(roundTripSeconds(cardiacOutput('typical', 0))).toBeCloseTo(57.1, 1);
    expect(roundTripSeconds(cardiacOutput('typical', 1))).toBeCloseTo(15, 0);
  });
});
