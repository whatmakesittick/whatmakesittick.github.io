import { describe, expect, it } from 'vitest';
import { WHEEL_IDS } from '../ids';
import {
  BALANCE,
  BALANCE_CENTRE,
  BANKING_PINS,
  CLICK_CENTRE,
  CROWN_SIDE,
  CROWN_WHEEL_CENTRE,
  HAIRSPRING,
  LEVER,
  MAINSPRING,
  MINUTE_WHEEL_CENTRE,
  PALLET_STAFF,
  WHEEL_CENTRES,
  distanceBetween,
  ratchetMeshDistance,
  wheelOuterReach,
} from './layout';
import { MOVEMENT_RADIUS_MM } from './scale';
import { MOTION_WORKS, TRAIN, wheelSpec } from './train';

describe('wheel centres', () => {
  it('puts the fourth wheel on the six o clock line', () => {
    expect(Math.abs(WHEEL_CENTRES.fourthWheel.x)).toBeLessThan(1e-9);
    expect(WHEEL_CENTRES.fourthWheel.y).toBeLessThan(-5);
  });

  it('puts the crown side at negative x so it sits at three o clock seen from the dial', () => {
    expect(CROWN_SIDE).toBe(-1);
    expect(CROWN_WHEEL_CENTRE.x).toBeLessThan(0);
    expect(CLICK_CENTRE.x).toBeLessThan(0);
    expect(BALANCE_CENTRE.x).toBeGreaterThan(0);
  });

  it('meshes every wheel with the next pinion exactly', () => {
    for (let i = 1; i < TRAIN.length; i += 1) {
      const driver = TRAIN[i - 1];
      const driven = TRAIN[i];
      const distance = distanceBetween(WHEEL_CENTRES[driver.id], WHEEL_CENTRES[driven.id]);
      expect(distance).toBeCloseTo(driver.radiusMm + driven.pinionRadiusMm, 9);
    }
  });

  it('keeps every wheel inside the movement', () => {
    for (const id of WHEEL_IDS) {
      expect(wheelOuterReach(id)).toBeLessThanOrEqual(MOVEMENT_RADIUS_MM);
    }
  });

  it('keeps the third and escape wheels apart in plan', () => {
    const gap = distanceBetween(WHEEL_CENTRES.thirdWheel, WHEEL_CENTRES.escapeWheel);
    expect(gap).toBeGreaterThan(wheelSpec('thirdWheel').radiusMm);
  });
});

describe('the lever line', () => {
  it('places the pallet staff and the balance on one line from the escape wheel', () => {
    const escape = WHEEL_CENTRES.escapeWheel;
    expect(distanceBetween(escape, PALLET_STAFF)).toBeCloseTo(LEVER.palletStaffFromEscapeMm);
    expect(distanceBetween(escape, BALANCE_CENTRE)).toBeCloseTo(LEVER.balanceFromEscapeMm);
    const cross =
      (PALLET_STAFF.x - escape.x) * (BALANCE_CENTRE.y - escape.y) -
      (PALLET_STAFF.y - escape.y) * (BALANCE_CENTRE.x - escape.x);
    expect(Math.abs(cross)).toBeLessThan(1e-9);
  });

  it('keeps the balance inside the movement', () => {
    const reach = Math.hypot(BALANCE_CENTRE.x, BALANCE_CENTRE.y) + BALANCE.radiusMm;
    expect(reach).toBeLessThanOrEqual(MOVEMENT_RADIUS_MM);
    expect(HAIRSPRING.outerRadiusMm).toBeLessThan(BALANCE.radiusMm);
  });

  it('straddles the fork with two banking pins', () => {
    const [left, right] = BANKING_PINS;
    expect(distanceBetween(left, right)).toBeCloseTo(2 * LEVER.bankingPinsHalfGapMm);
    expect(distanceBetween(left, PALLET_STAFF)).toBeCloseTo(distanceBetween(right, PALLET_STAFF));
  });
});

describe('the winding and motion works', () => {
  it('meshes the crown wheel with the ratchet wheel', () => {
    const distance = distanceBetween(WHEEL_CENTRES.barrel, CROWN_WHEEL_CENTRE);
    expect(distance).toBeCloseTo(ratchetMeshDistance(), 9);
  });

  it('meshes the minute wheel with the cannon pinion', () => {
    const { cannonPinion, minuteWheel } = MOTION_WORKS;
    expect(Math.hypot(MINUTE_WHEEL_CENTRE.x, MINUTE_WHEEL_CENTRE.y)).toBeCloseTo(
      cannonPinion.radiusMm + minuteWheel.radiusMm,
    );
  });

  it('keeps the barrel wall inside the barrel teeth', () => {
    expect(MAINSPRING.wallRadiusMm).toBeLessThan(wheelSpec('barrel').radiusMm);
    expect(MAINSPRING.arborRadiusMm).toBeLessThan(MAINSPRING.wallRadiusMm);
  });

  it('keeps the crown wheel inside the movement', () => {
    const reach = Math.hypot(CROWN_WHEEL_CENTRE.x, CROWN_WHEEL_CENTRE.y) + 2.25;
    expect(reach).toBeLessThanOrEqual(MOVEMENT_RADIUS_MM);
  });
});
