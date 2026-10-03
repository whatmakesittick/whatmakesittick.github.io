import { describe, expect, it } from 'vitest';
import {
  DETECTION_KM,
  LENS_HEIGHT_M,
  RADAR_HEIGHT_M,
  detectionCovered,
  hiddenUpToHalf,
  minutesAtTopSpeed,
  radarLineOfSightKm,
  surfaceDropM,
  visualHorizonKm,
} from './horizon';

describe('horizon', () => {
  it('sees a 0.5 m boat from a 20 m radar out to about 21 km', () => {
    expect(radarLineOfSightKm(20)).toBeCloseTo(21.3, 1);
    expect(RADAR_HEIGHT_M).toEqual({ min: 5, max: 50, step: 1, default: 20 });
  });

  it('puts the horizon about 3 km from the 0.7 m camera', () => {
    expect(LENS_HEIGHT_M).toBe(0.7);
    expect(visualHorizonKm(LENS_HEIGHT_M)).toBeCloseTo(3.2, 1);
  });

  it('crosses 21 km at 42 kn in about 16 minutes and the 9 km detection range in about 7', () => {
    expect(minutesAtTopSpeed(radarLineOfSightKm(20))).toBeCloseTo(16.5, 1);
    expect(DETECTION_KM).toBe(9.26);
    expect(minutesAtTopSpeed(DETECTION_KM)).toBeCloseTo(7.1, 1);
  });

  it('bends the sea so the line of sight grazes it at the radar horizon', () => {
    const radarHeight = 20;
    const horizonKm = radarLineOfSightKm(radarHeight) - radarLineOfSightKm(0);
    expect(surfaceDropM(horizonKm)).toBeCloseTo(radarHeight, 9);
    expect(surfaceDropM(0)).toBe(0);
  });

  it('expects detection only up to a moderate sea, sea state 4', () => {
    expect(detectionCovered('smooth')).toBe(true);
    expect(detectionCovered('moderate')).toBe(true);
    expect(detectionCovered('rough')).toBe(false);
  });

  it('hides the boat behind waves up to half the time from a slight sea up', () => {
    expect(hiddenUpToHalf('smooth')).toBe(false);
    expect(hiddenUpToHalf('slight')).toBe(true);
    expect(hiddenUpToHalf('rough')).toBe(true);
  });
});
