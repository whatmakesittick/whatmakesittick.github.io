import { describe, expect, it } from 'vitest';
import {
  GLIDERS,
  GLIDER_TYPES,
  POLAR_SPEED,
  bestGlide,
  clampPolarSpeed,
  glideRatio,
  sinkRate,
  speedForSink,
} from './polar';
import type { GliderType } from './polar';

const PUBLISHED_BEST_GLIDE: Record<GliderType, number> = { trainer: 34, racer15: 50, racer18: 57 };
const BEST_GLIDE_TOLERANCE = 2;

describe('sinkRate', () => {
  it.each(GLIDER_TYPES)('passes through the minimum sink and the fast point of the %s', (type) => {
    const { minSink, fast } = GLIDERS[type].polar;
    expect(sinkRate(type, minSink.speed)).toBeCloseTo(minSink.sink, 6);
    expect(sinkRate(type, fast.speed)).toBeCloseTo(fast.sink, 6);
  });

  it('sinks faster the faster it flies above the minimum sink speed', () => {
    expect(sinkRate('racer18', 150)).toBeGreaterThan(sinkRate('racer18', 120));
  });
});

describe('speedForSink', () => {
  it.each(GLIDER_TYPES)('inverts the polar of the %s on its fast side', (type) => {
    expect(speedForSink(type, sinkRate(type, 150))).toBeCloseTo(150, 6);
  });

  it('never flies slower than the minimum sink speed', () => {
    expect(speedForSink('trainer', 0.2)).toBe(GLIDERS.trainer.polar.minSink.speed);
  });
});

describe('bestGlide', () => {
  it.each(GLIDER_TYPES)('lands within two points of the published value for the %s', (type) => {
    const shown = Math.round(bestGlide(type).ratio);
    expect(Math.abs(shown - PUBLISHED_BEST_GLIDE[type])).toBeLessThanOrEqual(BEST_GLIDE_TOLERANCE);
  });

  it.each(GLIDER_TYPES)('is the best ratio anywhere on the slider for the %s', (type) => {
    const best = bestGlide(type);
    for (let speed = POLAR_SPEED.min; speed <= POLAR_SPEED.max; speed += POLAR_SPEED.step) {
      expect(glideRatio(type, speed)).toBeLessThanOrEqual(best.ratio + 1e-9);
    }
    expect(best.speed).toBeGreaterThanOrEqual(POLAR_SPEED.min);
    expect(best.speed).toBeLessThanOrEqual(POLAR_SPEED.max);
  });

  it('ranks the 18 m racer above the 15 m racer above the trainer', () => {
    expect(bestGlide('racer18').ratio).toBeGreaterThan(bestGlide('racer15').ratio);
    expect(bestGlide('racer15').ratio).toBeGreaterThan(bestGlide('trainer').ratio);
  });
});

describe('glideRatio', () => {
  it('still gives the 18 m racer about 40 to 1 at 200 km/h', () => {
    expect(glideRatio('racer18', 200)).toBeCloseTo(39.7, 1);
  });
});

describe('clampPolarSpeed', () => {
  it('keeps the airspeed within the slider range', () => {
    expect(clampPolarSpeed(40)).toBe(POLAR_SPEED.min);
    expect(clampPolarSpeed(260)).toBe(POLAR_SPEED.max);
    expect(clampPolarSpeed(120)).toBe(120);
  });
});
