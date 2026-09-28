import { describe, expect, it } from 'vitest';
import { CHAMBER_IDS } from '../../ids';
import { APEX, CHAMBERS, SEPTUM, VALVES } from '../../model';
import { SHAPE_SPEC } from '../constants';
import { blobBounds, heartShapes, unionBounds } from './heartShape';

const shapes = heartShapes(SHAPE_SPEC);

describe('heart shape', () => {
  it('puts every chamber centre inside its own cavity', () => {
    for (const id of CHAMBER_IDS) {
      const [x, y, z] = CHAMBERS[id].centre;
      expect(shapes.chambers[id].distance(x, y, z)).toBeLessThan(0);
      expect(shapes.envelope.distance(x, y, z)).toBeLessThan(0);
    }
  });

  it('wraps every cavity in muscle', () => {
    for (const id of CHAMBER_IDS) {
      const [x, y, z] = CHAMBERS[id].centre;
      expect(shapes.envelope.distance(x, y, z)).toBeLessThan(shapes.chambers[id].distance(x, y, z));
    }
  });

  it('keeps the left ventricle wall thicker than the right', () => {
    const step = 0.25;
    const wallThickness = (side: 'left' | 'right', x0: number, y: number, direction: 1 | -1) => {
      let x = x0;
      while (shapes.sides[side].distance(x, y, 0) < 0) x += step * direction;
      let outer = x;
      while (shapes.envelope.distance(outer, y, 0) < 0) outer += step * direction;
      return Math.abs(outer - x);
    };
    const left = wallThickness('left', CHAMBERS.leftVentricle.centre[0], -30, 1);
    const right = wallThickness('right', CHAMBERS.rightVentricle.centre[0], -20, -1);
    expect(left).toBeGreaterThan(right * 1.8);
  });

  it('keeps a solid septum between the ventricles', () => {
    expect(shapes.sides.left.distance(SEPTUM.x, -40, 0)).toBeGreaterThan(0);
    expect(shapes.sides.right.distance(SEPTUM.x, -40, 0)).toBeGreaterThan(0);
    expect(shapes.envelope.distance(SEPTUM.x, -40, 0)).toBeLessThan(0);
  });

  it('opens each ventricle to its atrium through the valve ring', () => {
    const { centre: tricuspid } = VALVES.tricuspid;
    const { centre: mitral } = VALVES.mitral;
    expect(shapes.sides.right.distance(...tricuspid)).toBeLessThan(0);
    expect(shapes.sides.left.distance(...mitral)).toBeLessThan(0);
  });

  it('points the apex where the layout puts it', () => {
    expect(Math.abs(shapes.envelope.distance(...APEX))).toBeLessThan(6);
  });

  it('knows where each vessel leaves the heart', () => {
    expect(shapes.portals.length).toBeGreaterThanOrEqual(8);
    for (const portal of shapes.portals) {
      expect(Math.hypot(...portal.normal)).toBeCloseTo(1, 5);
      expect(portal.beyond.length).toBeGreaterThan(2);
    }
    expect(shapes.sidePortals.right.length + shapes.sidePortals.left.length).toBe(
      shapes.portals.length,
    );
  });

  it('bounds blobs and unions of bounds', () => {
    const bounds = unionBounds([
      blobBounds({ kind: 'ellipsoid', centre: [0, 0, 0], radii: [1, 2, 3] }),
      blobBounds({ kind: 'cone', from: [5, 0, 0], to: [10, 0, 0], fromRadius: 1, toRadius: 2 }),
    ]);
    expect(bounds.min[0]).toBeLessThanOrEqual(-1);
    expect(bounds.max[0]).toBeGreaterThanOrEqual(12);
  });
});
