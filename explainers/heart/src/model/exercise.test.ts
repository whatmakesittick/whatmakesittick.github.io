import { describe, expect, it } from 'vitest';
import { BEAT_MS, SEMILUNAR_CLOSE_MS, AV_VALVES_CLOSE_MS } from './cycle';
import {
  MAX_HEART_RATE,
  MAX_STROKE_ML,
  REST_HEART_RATE,
  REST_STROKE_ML,
  REST_SYSTOLE_MS,
  beatLength,
  cardiacOutput,
  diastoleLength,
  heartRate,
  roundTripSeconds,
  strokeVolume,
  systoleLength,
} from './exercise';

describe('exercise', () => {
  it('climbs from 75 to 190 beats a minute', () => {
    expect(heartRate(0)).toBe(REST_HEART_RATE);
    expect(heartRate(1)).toBe(MAX_HEART_RATE);
    expect(heartRate(0.5)).toBeCloseTo(132.5);
  });

  it('raises the stroke early and holds it from half effort', () => {
    expect(strokeVolume(0)).toBe(REST_STROKE_ML);
    expect(strokeVolume(0.25)).toBeCloseTo(96.25);
    expect(strokeVolume(0.5)).toBe(MAX_STROKE_ML);
    expect(strokeVolume(1)).toBe(MAX_STROKE_ML);
  });

  it('moves about 5 litres a minute at rest and about 20 flat out', () => {
    expect(cardiacOutput(0)).toBeCloseTo(5.25);
    expect(cardiacOutput(1)).toBeCloseTo(19.95);
  });

  it('matches the resting beat of the cycle model', () => {
    expect(beatLength(REST_HEART_RATE)).toBe(BEAT_MS);
    expect(REST_SYSTOLE_MS).toBe(SEMILUNAR_CLOSE_MS - AV_VALVES_CLOSE_MS);
    expect(systoleLength(REST_HEART_RATE)).toBeCloseTo(320);
    expect(diastoleLength(REST_HEART_RATE)).toBeCloseTo(480);
  });

  it('keeps most of the squeeze and loses most of the filling time flat out', () => {
    expect(systoleLength(MAX_HEART_RATE)).toBeCloseTo(201, 0);
    expect(diastoleLength(MAX_HEART_RATE)).toBeCloseTo(115, 0);
  });

  it('sends a drop round the body in about a minute at rest', () => {
    expect(roundTripSeconds(cardiacOutput(0))).toBeCloseTo(57.1, 1);
    expect(roundTripSeconds(cardiacOutput(1))).toBeCloseTo(15, 0);
  });
});
