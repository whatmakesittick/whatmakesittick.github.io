import { describe, expect, it } from 'vitest';
import {
  CASE_HEIGHT_MM,
  CASE_INNER_RADIUS_MM,
  DIAL_RADIUS_MM,
  LEVELS,
  MOVEMENT_RADIUS_MM,
  UNITS_PER_MM,
  levelHeight,
  levelMiddle,
  mm,
  toMillimetres,
} from './scale';

describe('mm', () => {
  it('converts millimetres to world units and back', () => {
    expect(mm(1)).toBe(UNITS_PER_MM);
    expect(toMillimetres(mm(12.8))).toBeCloseTo(12.8);
  });
});

describe('LEVELS', () => {
  it('orders every span bottom to top', () => {
    for (const [bottom, top] of Object.values(LEVELS)) {
      expect(top).toBeGreaterThan(bottom);
    }
  });

  it('keeps every part inside the case height', () => {
    for (const [bottom, top] of Object.values(LEVELS)) {
      expect(bottom).toBeGreaterThanOrEqual(CASE_HEIGHT_MM[0]);
      expect(top).toBeLessThanOrEqual(CASE_HEIGHT_MM[1]);
    }
  });

  it('stacks the dial side below the plate and the bridges above the train', () => {
    expect(LEVELS.dial[1]).toBeLessThanOrEqual(LEVELS.mainplate[0]);
    expect(LEVELS.bridges[0]).toBeGreaterThanOrEqual(LEVELS.thirdWheel[1]);
    expect(LEVELS.balanceCock[0]).toBeGreaterThanOrEqual(LEVELS.regulator[1]);
  });

  it('meshes pinions with the wheels that drive them at the same height', () => {
    const overlaps = (a: readonly [number, number], b: readonly [number, number]) =>
      a[0] < b[1] && b[0] < a[1];
    expect(overlaps(LEVELS.barrelTeeth, LEVELS.centrePinion)).toBe(true);
    expect(overlaps(LEVELS.centreWheel, LEVELS.thirdPinion)).toBe(true);
    expect(overlaps(LEVELS.thirdWheel, LEVELS.fourthPinion)).toBe(true);
    expect(overlaps(LEVELS.fourthWheel, LEVELS.escapePinion)).toBe(true);
    expect(overlaps(LEVELS.escapeWheel, LEVELS.palletBody)).toBe(true);
    expect(overlaps(LEVELS.palletHorns, LEVELS.roller)).toBe(true);
  });

  it('reads the middle and height of a level', () => {
    expect(levelMiddle('mainplate')).toBeCloseTo(-0.45);
    expect(levelHeight('mainplate')).toBeCloseTo(0.9);
  });
});

describe('radii', () => {
  it('nests the movement inside the dial and the case', () => {
    expect(MOVEMENT_RADIUS_MM).toBeLessThan(DIAL_RADIUS_MM);
    expect(DIAL_RADIUS_MM).toBeLessThan(CASE_INNER_RADIUS_MM);
  });
});
