import { describe, expect, it } from 'vitest';
import {
  SHIP_CLOCK_FACTOR,
  arrivalTime,
  clockRatio,
  coordinateTime,
  dimming,
  flashGap,
  flashTone,
  lightTravelTime,
  redshift,
  shipClock,
  staticDilation,
} from './clocks';
import { CENTRE_TIME, HORIZON_TIME, etaAtRadius, tauAtRadius } from './fall';

describe('the clocks', () => {
  it('slows a clock held still near the hole', () => {
    expect(staticDilation(5)).toBeCloseTo(0.894, 3);
    expect(staticDilation(1)).toBe(0);
    expect(SHIP_CLOCK_FACTOR).toBeCloseTo(0.9618, 3);
  });

  it('counts far-away time along the fall', () => {
    expect(coordinateTime(etaAtRadius(5))).toBeCloseTo(0, 5);
    expect(coordinateTime(etaAtRadius(4))).toBeCloseTo(465.7, 0);
    expect(coordinateTime(etaAtRadius(2))).toBeCloseTo(792.8, 0);
    expect(coordinateTime(etaAtRadius(1.05))).toBeCloseTo(998, 0);
    expect(coordinateTime(etaAtRadius(1))).toBe(Infinity);
  });

  it('delays light climbing out', () => {
    expect(lightTravelTime(5, 20)).toBeCloseTo(700.9, 0);
    expect(lightTravelTime(1, 20)).toBe(Infinity);
  });

  it('starts the ship clock when the ship sees the release', () => {
    expect(shipClock(0)).toBeCloseTo(0, 5);
    expect(shipClock(tauAtRadius(4))).toBeCloseTo(500, 0);
    expect(shipClock(tauAtRadius(2))).toBeCloseTo(941, 0);
    expect(shipClock(tauAtRadius(1.05))).toBeCloseTo(1299, 0);
    expect(shipClock(HORIZON_TIME)).toBe(Infinity);
    expect(shipClock(CENTRE_TIME)).toBe(Infinity);
    expect(arrivalTime(CENTRE_TIME)).toBe(Infinity);
  });

  it('reddens the beacon on the way down', () => {
    expect(redshift(5)).toBeCloseTo(1.118, 2);
    expect(redshift(2)).toBeCloseTo(2.88, 2);
    expect(redshift(1.05)).toBeCloseTo(37, 0);
    expect(redshift(1)).toBe(Infinity);
    expect(redshift(0.5)).toBe(Infinity);
  });

  it('turns the redshift into ship seconds per probe second', () => {
    expect(clockRatio(0)).toBeCloseTo(1.08, 2);
    expect(clockRatio(tauAtRadius(4))).toBeCloseTo(1.43, 2);
    expect(clockRatio(tauAtRadius(3))).toBeCloseTo(1.82, 2);
    expect(clockRatio(tauAtRadius(2))).toBeCloseTo(2.77, 2);
    expect(clockRatio(tauAtRadius(1.5))).toBeCloseTo(4.55, 2);
    expect(clockRatio(tauAtRadius(1.2))).toBeCloseTo(9.75, 1);
    expect(clockRatio(HORIZON_TIME)).toBe(Infinity);
    expect(flashGap(tauAtRadius(2))).toBeCloseTo(27.7, 1);
  });

  it('dims the probe and names the flash colour', () => {
    expect(dimming(0)).toBeCloseTo(0.64, 2);
    expect(dimming(tauAtRadius(2))).toBeCloseTo(0.0145, 3);
    expect(dimming(HORIZON_TIME)).toBe(0);
    expect(flashTone(0)).toBe('white');
    expect(flashTone(tauAtRadius(3))).toBe('orange');
    expect(flashTone(tauAtRadius(1.5))).toBe('red');
    expect(flashTone(tauAtRadius(1.1))).toBe('infrared');
    expect(flashTone(tauAtRadius(1.001))).toBe('gone');
    expect(flashTone(CENTRE_TIME)).toBe('gone');
  });
});
