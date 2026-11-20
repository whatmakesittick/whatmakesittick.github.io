import type { Box3 } from 'three';
import { BoxGeometry, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { barBetween, merged, radialPiece, rodBetween, spot, tubeAlong } from './pipes';

const ROD_RADIUS = 0.01;

describe('pipes', () => {
  it('runs a tube through its end points', () => {
    const points = [new Vector3(0, 1, 0), new Vector3(1, 1, 0), new Vector3(2, 1.5, 0.5)];
    const geometry = tubeAlong(points, ROD_RADIUS);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox as Box3;
    expect(box.min.x).toBeCloseTo(0, 1);
    expect(box.max.x).toBeCloseTo(2, 1);
    expect(box.max.y).toBeGreaterThan(1.4);
  });

  it('puts a rod between two points', () => {
    const geometry = rodBetween(new Vector3(0, 0, 0), new Vector3(0, 0, 2), ROD_RADIUS);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox as Box3;
    expect(box.max.z - box.min.z).toBeCloseTo(2, 5);
  });

  it('puts a bar between two points', () => {
    const geometry = barBetween(new Vector3(1, 0, 0), new Vector3(3, 0, 0), ROD_RADIUS);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox as Box3;
    expect(box.min.x).toBeCloseTo(1, 5);
    expect(box.max.x).toBeCloseTo(3, 5);
  });

  it('places a piece on the radius at an angle from the top', () => {
    const geometry = radialPiece(new BoxGeometry(0.1, 0.1, 0.1), 2, 1, Math.PI / 2);
    geometry.computeBoundingBox();
    const centre = new Vector3();
    (geometry.boundingBox as Box3).getCenter(centre);
    expect(centre.distanceTo(spot(2, 1, Math.PI / 2))).toBeLessThan(1e-6);
  });

  it('merges parts into one geometry', () => {
    const geometry = merged([new BoxGeometry(1, 1, 1), new BoxGeometry(1, 1, 1)]);
    expect(geometry.getAttribute('position').count).toBe(48);
  });
});
