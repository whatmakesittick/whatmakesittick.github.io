import { describe, expect, it } from 'vitest';
import type { FarmSite } from '../ids';
import { MAX_PLUME_D, ROTOR_DIAMETER_M, ROTOR_RADIUS_M, TURBINE_COUNT } from './constants';
import { farmLayout, HERO_SITE } from './layout';
import { thrustCoefficient, turbinePowerKw } from './power';
import {
  axialInduction,
  centrelineDeficit,
  farmPowerKw,
  initialDeficit,
  overlapShare,
  plumeLengthD,
  wakeDeficits,
  wakeLoss,
} from './wakes';

const THRUST_AT_8 = 0.79;
const LEAD: FarmSite = { row: 0, column: 0, x: 0, z: 0 };

function behind(xOverD: number, lateralM = 0): FarmSite {
  return { row: 1, column: 0, x: xOverD * ROTOR_DIAMETER_M, z: lateralM };
}

describe('wake strength', () => {
  it('starts the deficit at twice the axial induction', () => {
    expect(initialDeficit(THRUST_AT_8)).toBeCloseTo(0.5417, 4);
    expect(axialInduction(THRUST_AT_8)).toBeCloseTo(0.2709, 4);
    expect(initialDeficit(0)).toBe(0);
  });

  it('leaves about 13 % less wind on the centreline 7 D behind at 8 m/s', () => {
    expect(centrelineDeficit(thrustCoefficient(8), 7)).toBeCloseTo(0.129, 3);
    expect(centrelineDeficit(THRUST_AT_8, 0)).toBe(initialDeficit(THRUST_AT_8));
  });
});

describe('overlapShare', () => {
  it('covers the whole rotor when the wake is wider and centred', () => {
    expect(overlapShare(0, 100, ROTOR_RADIUS_M)).toBe(1);
    expect(overlapShare(20, 100, ROTOR_RADIUS_M)).toBe(1);
  });

  it('misses the rotor once the circles part', () => {
    expect(overlapShare(175, 100, ROTOR_RADIUS_M)).toBe(0);
    expect(overlapShare(-300, 100, ROTOR_RADIUS_M)).toBe(0);
  });

  it('shares half the rotor when two equal circles meet at the centre line', () => {
    expect(overlapShare(0, ROTOR_RADIUS_M, ROTOR_RADIUS_M)).toBe(1);
    const halfOffset = ROTOR_RADIUS_M * 0.8079;
    expect(overlapShare(halfOffset, ROTOR_RADIUS_M, ROTOR_RADIUS_M)).toBeCloseTo(0.5, 3);
  });

  it('shrinks smoothly as the offset grows', () => {
    const shares = [0, 40, 80, 120, 160].map((offset) => overlapShare(offset, 120, ROTOR_RADIUS_M));
    shares.slice(1).forEach((share, index) => expect(share).toBeLessThanOrEqual(shares[index]));
  });
});

describe('wakeDeficits', () => {
  it('slows only the turbine downwind of the other', () => {
    const [lead, trailing] = wakeDeficits([LEAD, behind(7)], THRUST_AT_8, 270);
    expect(lead).toBe(0);
    expect(trailing).toBeCloseTo(centrelineDeficit(THRUST_AT_8, 7), 9);
  });

  it('blows toward +x from 270 and toward −x from 90', () => {
    expect(wakeDeficits([LEAD, behind(7)], THRUST_AT_8, 90)[0]).toBeCloseTo(
      centrelineDeficit(THRUST_AT_8, 7),
      9,
    );
  });

  it('turns a few degrees of veer into a small sideways shift', () => {
    const straight = wakeDeficits([LEAD, behind(7)], THRUST_AT_8, 270)[1];
    const veered = wakeDeficits([LEAD, behind(7)], THRUST_AT_8, 276)[1];
    expect(veered).toBeGreaterThan(0);
    expect(veered).toBeLessThan(straight);
    expect(wakeDeficits([LEAD, behind(7, 110)], THRUST_AT_8, 276)[1]).toBeGreaterThan(veered);
  });

  it('adds wakes from two turbines as the root of the sum of squares', () => {
    const [, , last] = wakeDeficits([LEAD, behind(7), behind(14)], THRUST_AT_8, 270);
    const fromLead = centrelineDeficit(THRUST_AT_8, 14);
    const fromMiddle = centrelineDeficit(THRUST_AT_8, 7);
    expect(last).toBeCloseTo(Math.hypot(fromLead, fromMiddle), 9);
  });

  it('keeps the upwind row free in the farm', () => {
    const deficits = wakeDeficits(farmLayout(7), THRUST_AT_8, 270);
    expect(deficits).toHaveLength(TURBINE_COUNT);
    expect(deficits[HERO_SITE]).toBe(0);
    expect(Math.max(...deficits)).toBeCloseTo(0.056, 3);
  });
});

describe('farm power', () => {
  it('loses about 7.6, 4.9 and 3.5 % to wakes at 8 m/s from 270', () => {
    expect(wakeLoss(8, 270, 5)).toBeCloseTo(0.076, 3);
    expect(wakeLoss(8, 270, 7)).toBeCloseTo(0.049, 3);
    expect(wakeLoss(8, 270, 9)).toBeCloseTo(0.035, 3);
  });

  it('sums the waked turbines below 27 free ones', () => {
    const farm = farmPowerKw(8, 270, 7);
    expect(farm).toBeLessThan(TURBINE_COUNT * turbinePowerKw(8));
    expect(farm).toBeCloseTo(TURBINE_COUNT * turbinePowerKw(8) * (1 - wakeLoss(8, 270, 7)), 6);
  });

  it('makes nothing below cut-in or from cut-out up', () => {
    expect(farmPowerKw(2, 270, 7)).toBe(0);
    expect(farmPowerKw(25, 270, 7)).toBe(0);
    expect(wakeLoss(2, 270, 7)).toBe(0);
    expect(wakeLoss(25, 270, 7)).toBe(0);
  });

  it('barely loses anything at full power', () => {
    expect(wakeLoss(15, 270, 7)).toBeLessThan(0.001);
  });
});

describe('plumeLengthD', () => {
  it('draws the visible plume about 8.6 D at 12 m/s and 4.1 D at 15 m/s', () => {
    expect(plumeLengthD(thrustCoefficient(12))).toBeCloseTo(8.6, 1);
    expect(plumeLengthD(thrustCoefficient(15))).toBeCloseTo(4.09, 2);
  });

  it('caps the 21.7 D plume at 8 m/s to the drawing limit', () => {
    expect(plumeLengthD(thrustCoefficient(8))).toBe(MAX_PLUME_D);
  });

  it('draws no plume without thrust', () => {
    expect(plumeLengthD(0)).toBe(0);
  });
});
