import { describe, expect, it } from 'vitest';
import { BETZ_LIMIT, RATED_KW } from './constants';
import {
  betzShare,
  isGenerating,
  powerCoefficient,
  thrustCoefficient,
  turbinePowerKw,
  windPowerKw,
} from './power';

describe('turbine power', () => {
  it('makes nothing below cut-in and from cut-out up', () => {
    expect(turbinePowerKw(2.9)).toBe(0);
    expect(turbinePowerKw(24.5)).toBe(0);
    expect(turbinePowerKw(30)).toBe(0);
    expect(isGenerating(3)).toBe(true);
    expect(isGenerating(24.5)).toBe(false);
  });

  it('follows the published power curve between the knots', () => {
    expect(turbinePowerKw(3)).toBe(81);
    expect(turbinePowerKw(8)).toBe(2545);
    expect(turbinePowerKw(7.5)).toBeCloseTo(2127, 9);
    expect(turbinePowerKw(15)).toBe(RATED_KW);
    expect(turbinePowerKw(24)).toBe(1283);
  });
});

describe('thrust coefficient', () => {
  it('reads the thrust curve and holds it flat past its ends', () => {
    expect(thrustCoefficient(8)).toBe(0.79);
    expect(thrustCoefficient(3.5)).toBe(0.83);
    expect(thrustCoefficient(22)).toBe(0.06);
  });

  it('drops to zero when the rotor is not running', () => {
    expect(thrustCoefficient(2)).toBe(0);
    expect(thrustCoefficient(25)).toBe(0);
  });
});

describe('power in the wind', () => {
  it('grows with the cube of the wind at about 10.82 kW per (m/s)³', () => {
    expect(windPowerKw(1)).toBeCloseTo(10.82, 2);
    expect(windPowerKw(10)).toBeCloseTo(10_823.5, 0);
    expect(windPowerKw(0)).toBe(0);
  });

  it('peaks the power coefficient near 0.46 from 6.5 to 8 m/s', () => {
    expect(powerCoefficient(7)).toBeCloseTo(0.46, 2);
    expect(powerCoefficient(8)).toBeCloseTo(0.46, 2);
    const winds = Array.from({ length: 41 }, (_, index) => 3 + index * 0.5);
    const peak = Math.max(...winds.map(powerCoefficient));
    expect(peak).toBeCloseTo(0.466, 3);
  });

  it('gives no power coefficient when the turbine makes nothing', () => {
    expect(powerCoefficient(2)).toBe(0);
    expect(powerCoefficient(25)).toBe(0);
  });

  it('stays below the Betz limit', () => {
    expect(betzShare(8)).toBeCloseTo(powerCoefficient(8) / BETZ_LIMIT, 9);
    expect(betzShare(8)).toBeCloseTo(0.775, 3);
    expect(betzShare(8)).toBeLessThan(1);
  });
});
