import { describe, expect, it } from 'vitest';
import { CHAMBER_IDS } from '../../ids';
import { APEX, CHAMBERS, SEPTUM, VALVES } from '../../model';
import { SHAPE_SPEC } from '../constants';
import { heartShapes } from './heartShape';

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

  it('bounds the envelope and both cavities', () => {
    const inside = (bounds: typeof shapes.envelopeBounds, point: readonly number[]) =>
      point.every((value, axis) => value >= bounds.min[axis] && value <= bounds.max[axis]);
    expect(inside(shapes.envelopeBounds, APEX)).toBe(true);
    expect(inside(shapes.sideBounds.left, CHAMBERS.leftVentricle.centre)).toBe(true);
    expect(inside(shapes.sideBounds.right, CHAMBERS.rightAtrium.centre)).toBe(true);
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
});
