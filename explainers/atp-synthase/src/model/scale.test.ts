import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { toRadians } from '@core/math';
import {
  AXLE,
  C_RING,
  GATE,
  HEAD,
  MEMBRANE,
  MOTOR_HEIGHT,
  PERIPHERAL_STALK,
  PUMPS,
  PUMP_IDS,
  ROW_SPACING_NM,
  azimuthPoint,
  nm,
  rowOffsetZ,
  spanLength,
  spanMiddle,
  toNanometres,
} from './scale';

describe('scale', () => {
  it('draws ten world units per nanometre', () => {
    expect(nm(2.5)).toBe(25);
    expect(toNanometres(25)).toBe(2.5);
  });

  it('matches the measured sizes of the human enzyme', () => {
    expect(spanLength(MOTOR_HEIGHT)).toBeCloseTo(23.5, 0);
    expect(spanLength(HEAD.span)).toBeCloseTo(10.3, 1);
    expect(HEAD.radius * 2).toBe(11);
    expect(C_RING.outerRadius * 2).toBeCloseTo(5.5);
    expect(spanLength(C_RING.height)).toBeCloseTo(6.7);
    expect(spanLength(AXLE.gamma)).toBeCloseTo(11.5);
    expect(HEAD.span[0] - C_RING.height[1]).toBeCloseTo(4);
    expect(spanMiddle(HEAD.span)).toBeGreaterThan(11.5);
    expect(spanMiddle(HEAD.span)).toBeLessThan(13);
    expect(spanLength(PERIPHERAL_STALK.span)).toBeCloseTo(21.5, 0);
  });

  it('keeps the membrane about 4 to 5 nm thick with the glutamates at its midplane', () => {
    expect(spanLength(MEMBRANE.bilayer)).toBeGreaterThanOrEqual(4);
    expect(spanLength(MEMBRANE.bilayer)).toBeLessThanOrEqual(5);
    expect(spanMiddle(MEMBRANE.core)).toBe(0);
    expect(C_RING.glutamateRadius).toBeLessThan(C_RING.outerRadius);
    expect(GATE.innerRadius).toBeGreaterThan(C_RING.outerRadius);
  });

  it('measures azimuth counterclockwise seen from the matrix, like rotation about +y', () => {
    const quarter = azimuthPoint(90, 1, 0);
    expect(quarter.x).toBeCloseTo(0);
    expect(quarter.z).toBeCloseTo(-1);
    const turned = new Vector3(1, 0, 0).applyAxisAngle(new Vector3(0, 1, 0), toRadians(90));
    expect(turned.x).toBeCloseTo(quarter.x);
    expect(turned.z).toBeCloseTo(quarter.z);
  });

  it('keeps the pumps clear of the motor and the row inside the membrane patch', () => {
    PUMP_IDS.forEach((id) => {
      expect(PUMPS[id].x + PUMPS[id].radius).toBeLessThan(-HEAD.radius);
      expect(PUMPS[id].x - PUMPS[id].radius).toBeGreaterThan(MEMBRANE.patchX[0]);
    });
    expect(rowOffsetZ(9) - HEAD.radius).toBeGreaterThan(MEMBRANE.patchZ[0]);
    expect(ROW_SPACING_NM).toBeGreaterThan(HEAD.radius * 2);
  });
});
