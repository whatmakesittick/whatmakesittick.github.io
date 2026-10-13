import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  BAR_PLANE_Z,
  CRANK_Y,
  REGION_BOUNDS,
  RISE_DEG,
  SAW_GEOMETRY,
  rotateAboutZ,
} from '../model';
import { CYLINDER } from './constants';
import { gripReach, regionBox } from './regions';

const LIFT = 0.16;
const NOSE_X = REGION_BOUNDS.bar.max[0];

describe('regions', () => {
  it('frames the cylinder tighter than its model bounds, head to crank', () => {
    const box = regionBox('cylinder', 0);
    const size = box.getSize(new Vector3());
    const { min, max } = REGION_BOUNDS.cylinder;
    expect(size.y).toBeLessThan(max[1] - min[1]);
    expect(box.min.y).toBeLessThan(CYLINDER.base);
    expect(box.max.y).toBeGreaterThan(CYLINDER.headTop);
    expect(box.max.x).toBeGreaterThan(CYLINDER.finOuter);
  });

  it('frames the kickback lower than its model envelope, the risen nose still inside', () => {
    const box = regionBox('kickback', 0);
    const { min, max } = REGION_BOUNDS.kickback;
    const risenNose = rotateAboutZ([NOSE_X, CRANK_Y, BAR_PLANE_Z], SAW_GEOMETRY.rearGrip, RISE_DEG);
    expect(box.getSize(new Vector3()).y).toBeLessThan(max[1] - min[1]);
    expect(box.max.x).toBe(max[0]);
    expect(box.containsPoint(new Vector3(...risenNose))).toBe(true);
  });

  it('frames the starter tighter than its model region, the caps and the pulled grip inside', () => {
    const box = regionBox('starter', 0);
    const { min, max } = REGION_BOUNDS.starter;
    expect(box.getSize(new Vector3()).x).toBeLessThan(max[0] - min[0]);
    expect(box.getSize(new Vector3()).z).toBeLessThan(max[2] - min[2]);
    [gripReach(), SAW_GEOMETRY.fuelCap.centre, SAW_GEOMETRY.oilCap.centre].forEach((point) =>
      expect(box.containsPoint(new Vector3(...point))).toBe(true),
    );
  });

  it('lifts every region with the saw', () => {
    const { min } = REGION_BOUNDS.bar;
    expect(regionBox('bar', LIFT).min.y).toBeCloseTo(min[1] + LIFT, 9);
  });
});
