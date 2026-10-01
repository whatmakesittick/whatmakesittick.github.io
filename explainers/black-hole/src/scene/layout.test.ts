import { describe, expect, it } from 'vitest';
import { RELEASE_RADIUS, SHIP_RADIUS } from '../model';
import {
  FALL_DIRECTION,
  ORBIT_PERIOD_S,
  SHEET,
  probePosition,
  sheetDepth,
  shipAngle,
  shipPosition,
} from './layout';

describe('layout', () => {
  it('places the probe on the fall line', () => {
    expect(FALL_DIRECTION.length()).toBeCloseTo(1, 9);
    expect(probePosition(RELEASE_RADIUS).length()).toBeCloseTo(RELEASE_RADIUS, 9);
    expect(probePosition(1).y).toBeGreaterThan(0);
    expect(probePosition(1).z).toBe(0);
  });

  it('keeps the ship on its orbit and starts it on the fall line', () => {
    expect(ORBIT_PERIOD_S / 3600).toBeCloseTo(9.3, 1);
    expect(shipPosition(0).length()).toBeCloseTo(SHIP_RADIUS, 9);
    expect(shipPosition(0).normalize().distanceTo(FALL_DIRECTION)).toBeCloseTo(0, 9);
    expect(shipAngle(743) - shipAngle(0)).toBeGreaterThan(0.1);
    expect(shipAngle(743) - shipAngle(0)).toBeLessThan(0.2);
  });

  it('dips the sheet toward the horizon with the rim level', () => {
    expect(sheetDepth(SHEET.rim)).toBeCloseTo(0, 9);
    expect(sheetDepth(1)).toBeCloseTo(2 * Math.sqrt(SHEET.rim - 1), 9);
    expect(sheetDepth(5)).toBeGreaterThan(0);
    expect(sheetDepth(5)).toBeLessThan(sheetDepth(1));
  });
});
