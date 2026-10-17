import { describe, expect, it } from 'vitest';
import { CORNER_NOZZLE_MAX_N } from '../../../model/constants';
import { PLUME_LOOKS, PLUME_WAKE_SHARE } from './constants';
import { plumeLength, plumeReach, puffDistance, puffShape } from './plumeShape';
import type { PuffShape } from './plumeShape';

const HELIUM_SCALE = 1.6;

function shapeAt(progress: number, length: number, gas: 'air' | 'helium' = 'air'): PuffShape {
  return puffShape(progress, length, PLUME_LOOKS[gas], {
    distance: 0,
    radius: 0,
    diameter: 0,
    alpha: 0,
  });
}

describe('plume length', () => {
  it('reaches one and a half metres at the corner nozzle limit', () => {
    expect(plumeLength(CORNER_NOZZLE_MAX_N, 'air')).toBeCloseTo(1.5);
    expect(plumeLength(CORNER_NOZZLE_MAX_N / 2, 'nitrogen')).toBeCloseTo(0.75);
  });

  it('runs longer for helium', () => {
    expect(plumeLength(4000, 'helium')).toBeCloseTo(plumeLength(4000, 'air') * HELIUM_SCALE);
  });

  it('vanishes without thrust', () => {
    expect(plumeLength(0, 'air')).toBe(0);
    expect(plumeLength(-10, 'helium')).toBe(0);
  });

  it('trails a wake beyond the core', () => {
    expect(plumeReach(1)).toBeCloseTo(PLUME_WAKE_SHARE);
  });
});

describe('puff shape', () => {
  const length = 1;

  it('starts at the mouth and ends at the edge of the wake', () => {
    expect(puffDistance(0, length)).toBe(0);
    expect(puffDistance(1, length)).toBeCloseTo(plumeReach(length));
  });

  it('widens and fades with distance', () => {
    const near = shapeAt(0.2, length);
    const far = shapeAt(0.85, length);
    expect(far.radius).toBeGreaterThan(near.radius);
    expect(far.diameter).toBeGreaterThan(near.diameter);
    expect(far.alpha).toBeLessThan(near.alpha);
    expect(shapeAt(1, length).alpha).toBeCloseTo(0);
  });

  it('draws helium thinner and more transparent than condensing air', () => {
    const air = shapeAt(0.3, length);
    const helium = shapeAt(0.3, length, 'helium');
    expect(helium.alpha).toBeLessThan(air.alpha);
    expect(helium.radius).toBeLessThan(air.radius);
  });

  it('hides every puff of a plume with no length', () => {
    expect(shapeAt(0.5, 0).alpha).toBe(0);
  });
});
