import { describe, expect, it } from 'vitest';
import { ANCHOR_IDS, PART_IDS, REGION_IDS } from '../ids';
import {
  ANCHOR_POINTS,
  BEAM_WAYPOINTS,
  PART_POINTS,
  REGION_SPECS,
  WAYPOINT_IDS,
  mirrorSizeM,
  waypoint,
} from './layout';

describe('layout', () => {
  it('lists the waypoints in order with eleven bounces after the focus', () => {
    expect(BEAM_WAYPOINTS.map((entry) => entry.id)).toEqual([...WAYPOINT_IDS]);
    const bounces = BEAM_WAYPOINTS.filter((entry) => entry.bounce).map((entry) => entry.id);
    expect(bounces).toEqual(['i1', 'i2', 'i3', 'i4', 'mask', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
  });

  it('keeps the beam in the z = 0 plane', () => {
    BEAM_WAYPOINTS.forEach((entry) => expect(entry.point[2]).toBe(0));
  });

  it('puts the droplet 1.4 m above the plasma', () => {
    expect(waypoint('nozzle')[1] - waypoint('plasma')[1]).toBeCloseTo(1.4, 9);
  });

  it('gives every anchor, part and region a place', () => {
    expect(Object.keys(ANCHOR_POINTS)).toEqual([...ANCHOR_IDS]);
    expect(Object.keys(PART_POINTS)).toEqual([...PART_IDS]);
    expect(Object.keys(REGION_SPECS)).toEqual([...REGION_IDS]);
  });

  it('keeps every anchor inside the machine region', () => {
    const { x, y } = REGION_SPECS.machine;
    Object.values(ANCHOR_POINTS).forEach(([px, py]) => {
      expect(px).toBeGreaterThanOrEqual(x[0]);
      expect(px).toBeLessThanOrEqual(x[1]);
      expect(py).toBeGreaterThanOrEqual(y[0]);
      expect(py).toBeLessThanOrEqual(y[1]);
    });
  });

  it('sizes the last mirror by optics', () => {
    expect(mirrorSizeM('i1', 'na033')).toBe(0.3);
    expect(mirrorSizeM('p3', 'na033')).toBe(0.25);
    expect(mirrorSizeM('p6', 'na033')).toBe(0.4);
    expect(mirrorSizeM('p6', 'na055')).toBe(0.55);
  });
});
