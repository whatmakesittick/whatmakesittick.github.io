import { describe, expect, it } from 'vitest';
import {
  BARREL,
  BULLET_SEAT_X,
  BULLET_TRAVEL,
  CARRIER,
  CARRIER_STROKE,
  EJECTOR_X,
  FRONT_SIGHT,
  GAS_CYLINDER,
  GAS_PORT_X,
  MAGAZINE,
  OVERALL_LENGTH,
  REAR_SIGHT,
  RECEIVER,
  RIFLED_LENGTH,
  RIFLING,
  STOCK,
} from './layout';

describe('layout', () => {
  it('takes the barrel, the rifling and the sights from the facts sheet', () => {
    expect(BARREL.x[1] - BARREL.x[0]).toBe(415);
    expect(RIFLING.x[1] - RIFLING.x[0]).toBe(RIFLED_LENGTH);
    expect(RIFLING.x[0]).toBe(46);
    expect(FRONT_SIGHT.x - REAR_SIGHT.x).toBe(378);
  });

  it('seats the bullet so it travels 386 mm to the muzzle', () => {
    expect(BULLET_SEAT_X).toBeCloseTo(29.2, 6);
    expect(BULLET_TRAVEL).toBeCloseTo(385.8, 6);
  });

  it('runs 880 mm from the butt to the muzzle', () => {
    expect(BARREL.x[1] - STOCK.x[0]).toBe(OVERALL_LENGTH);
  });

  it('puts the gas port inside the rifling and the cylinder above the barrel', () => {
    expect(GAS_PORT_X).toBeGreaterThan(RIFLING.x[0]);
    expect(GAS_PORT_X).toBeLessThan(BARREL.x[1]);
    expect(GAS_CYLINDER.axisY - GAS_CYLINDER.radius).toBeGreaterThan(BARREL.radius);
  });

  it('keeps the carrier stroke inside the receiver', () => {
    expect(CARRIER.x[0] - CARRIER_STROKE).toBeGreaterThanOrEqual(RECEIVER.x[0]);
    expect(CARRIER.x[1]).toBeLessThanOrEqual(RECEIVER.x[1]);
  });

  it('hangs the magazine under the receiver floor', () => {
    expect(MAGAZINE.well.y[1]).toBeLessThanOrEqual(RECEIVER.y[0] + 12);
    expect(MAGAZINE.well.x[0]).toBeGreaterThan(RECEIVER.x[0]);
    expect(MAGAZINE.well.x[1]).toBeLessThan(RECEIVER.x[1]);
  });

  it('lets the ejector meet the case head before the carrier reaches the rear', () => {
    expect(-EJECTOR_X).toBeLessThan(CARRIER_STROKE);
    expect(-EJECTOR_X).toBeGreaterThan(0);
  });
});
