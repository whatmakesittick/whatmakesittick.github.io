import { describe, expect, it } from 'vitest';
import type { NozzlePartId } from '../../../ids';
import { CORNER_NOZZLE_MAX_N } from '../../../model/constants';
import { PLUME, PLUME_LOOKS, PLUME_PUFFS, PLUME_WAKE_SHARE } from './constants';
import { plumeLength } from '../../../model/plume';
import { plumeReach, puffDistance, puffShape } from './plumeShape';
import type { PlumeSpan, PuffShape } from './plumeShape';

const HELIUM_SCALE = 1.6;

function span(length: number, group: NozzlePartId = 'rearNozzles'): PlumeSpan {
  return { length, reach: plumeReach(length, group), puffs: PLUME_PUFFS[group] };
}

function shapeAt(progress: number, of: PlumeSpan, gas: 'air' | 'helium' = 'air'): PuffShape {
  const target = { distance: 0, radius: 0, diameter: 0, rise: 0, alpha: 0 };
  return puffShape(progress, of, PLUME_LOOKS[gas], target);
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

  it('trails a longer wake behind the rear nozzles than under the corners', () => {
    expect(plumeReach(1, 'rearNozzles')).toBeCloseTo(PLUME_WAKE_SHARE.rearNozzles);
    expect(plumeReach(1, 'cornerNozzles')).toBeCloseTo(PLUME_WAKE_SHARE.cornerNozzles);
    expect(PLUME_WAKE_SHARE.rearNozzles).toBeGreaterThan(PLUME_WAKE_SHARE.cornerNozzles);
  });
});

describe('puff shape', () => {
  const rear = span(1);

  it('starts at the mouth and ends at the edge of the wake', () => {
    expect(puffDistance(0, rear)).toBe(0);
    expect(puffDistance(1, rear)).toBeCloseTo(rear.reach);
  });

  it('starts as a tight bright core and billows wider and softer downstream', () => {
    const core = shapeAt(0.05, rear);
    const wake = shapeAt(0.6, rear);
    expect(core.distance).toBeLessThan(rear.length);
    expect(wake.distance).toBeGreaterThan(rear.length);
    expect(wake.radius).toBeGreaterThan(core.radius);
    expect(wake.diameter).toBeGreaterThan(core.diameter);
    expect(wake.alpha).toBeLessThan(core.alpha);
    expect(shapeAt(1, rear).alpha).toBeCloseTo(0);
  });

  it('drifts up only once the puffs leave the core', () => {
    expect(shapeAt(0.05, rear).rise).toBe(0);
    expect(shapeAt(0.9, rear).rise).toBeGreaterThan(shapeAt(0.6, rear).rise);
  });

  it('keeps the billows of a long sprint plume within the size cap', () => {
    expect(shapeAt(0.95, span(3.75)).diameter).toBeLessThanOrEqual(PLUME.maxDiameter);
  });

  it('draws helium thinner and more transparent than condensing air', () => {
    const air = shapeAt(0.3, rear);
    const helium = shapeAt(0.3, rear, 'helium');
    expect(helium.alpha).toBeLessThan(air.alpha);
    expect(helium.radius).toBeLessThan(air.radius);
  });

  it('hides every puff of a plume with no length', () => {
    expect(shapeAt(0.5, span(0)).alpha).toBe(0);
  });
});
