import { describe, expect, it } from 'vitest';
import { RELEASE_RADIUS } from './constants';
import {
  CENTRE_TIME,
  HORIZON_TIME,
  etaAtTau,
  localSpeed,
  radiusAtTau,
  tauAtEta,
  tauAtRadius,
  timeLeft,
} from './fall';

describe('the fall', () => {
  it('reaches the horizon after about 11:53 and the centre after about 12:23', () => {
    expect(HORIZON_TIME).toBeCloseTo(713.3, 0);
    expect(CENTRE_TIME).toBeCloseTo(743.4, 0);
  });

  it('passes the spec radii at the spec times', () => {
    expect(tauAtRadius(4)).toBeCloseTo(408.7, 0);
    expect(tauAtRadius(3)).toBeCloseTo(555.9, 0);
    expect(tauAtRadius(2)).toBeCloseTo(651.2, 0);
    expect(tauAtRadius(1.5)).toBeCloseTo(685.9, 0);
    expect(tauAtRadius(1.2)).toBeCloseTo(703.2, 0);
  });

  it('inverts the time to a radius', () => {
    for (const radius of [5, 4.5, 3, 2, 1.5, 1, 0.5]) {
      expect(radiusAtTau(tauAtRadius(radius))).toBeCloseTo(radius, 5);
    }
    expect(radiusAtTau(-1)).toBe(RELEASE_RADIUS);
    expect(radiusAtTau(CENTRE_TIME + 1)).toBeCloseTo(0, 5);
  });

  it('inverts the cycloid parameter monotonically', () => {
    let previous = -1;
    for (let tau = 0; tau <= CENTRE_TIME; tau += 20) {
      const eta = etaAtTau(tau);
      expect(eta).toBeGreaterThan(previous);
      expect(tauAtEta(eta)).toBeCloseTo(tau, 5);
      previous = eta;
    }
  });

  it('measures the local speed as a fraction of light speed', () => {
    expect(localSpeed(5)).toBeCloseTo(0, 5);
    expect(localSpeed(4)).toBeCloseTo(0.25, 2);
    expect(localSpeed(3)).toBeCloseTo(0.41, 2);
    expect(localSpeed(2)).toBeCloseTo(0.61, 2);
    expect(localSpeed(1.5)).toBeCloseTo(0.76, 2);
    expect(localSpeed(1.05)).toBeCloseTo(0.97, 2);
    expect(localSpeed(1)).toBe(1);
    expect(localSpeed(0.5)).toBe(1);
  });

  it('counts the probe time left to the centre', () => {
    expect(timeLeft(HORIZON_TIME)).toBeCloseTo(30.1, 0);
    expect(timeLeft(CENTRE_TIME + 5)).toBe(0);
  });
});
