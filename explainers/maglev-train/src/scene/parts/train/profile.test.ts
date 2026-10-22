import { describe, expect, it } from 'vitest';
import { BODY } from './constants';
import { bodyOutline, cabinOutline, clipAbove } from './cabin';
import { CABIN } from './constants';
import { CONTOUR, sideAt } from './profile';
import { Vector2 } from 'three';

describe('body contour', () => {
  it('runs from the floor centre to the roof centre', () => {
    const { rows } = CONTOUR;
    expect(rows[0].z).toBe(0);
    expect(rows[0].y).toBeCloseTo(BODY.floorY);
    expect(rows[rows.length - 1].z).toBeCloseTo(0);
    expect(rows[rows.length - 1].y).toBeCloseTo(BODY.roofY);
    expect(CONTOUR.cellRegions).toHaveLength(rows.length - 1);
  });

  it('keeps within the train width and faces outward on the side', () => {
    const widest = Math.max(...CONTOUR.rows.map((row) => row.z));
    expect(widest).toBeCloseTo(BODY.halfWidth, 2);
    expect(sideAt((BODY.bandBottom + BODY.bandTop) / 2).nz).toBeGreaterThan(0.9);
    expect(CONTOUR.rows[0].ny).toBeCloseTo(-1);
  });
});

describe('cabin outline', () => {
  it('clips a polygon to the part above a level', () => {
    const square = [new Vector2(0, 0), new Vector2(2, 0), new Vector2(2, 2), new Vector2(0, 2)];
    const clipped = clipAbove(square, 1);
    expect(Math.min(...clipped.map((point) => point.y))).toBe(1);
    expect(clipped).toHaveLength(4);
  });

  it('sits inside the body above the cabin floor', () => {
    const body = bodyOutline();
    const cabin = cabinOutline();
    const widest = (points: Vector2[]) => Math.max(...points.map((point) => Math.abs(point.x)));
    expect(widest(cabin)).toBeLessThan(widest(body));
    expect(Math.min(...cabin.map((point) => point.y))).toBeCloseTo(CABIN.floorY);
  });
});
