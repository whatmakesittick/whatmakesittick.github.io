import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { roundedRoute, routeLength, toVectors } from './route';

describe('rounded route', () => {
  it('starts and ends on the given points and cuts the corners', () => {
    const points = toVectors([
      [0, 0, 0],
      [10, 0, 0],
      [10, 10, 0],
    ]);
    const path = roundedRoute(points, 2);
    expect(path.getPoint(0).distanceTo(points[0])).toBeLessThan(1e-9);
    expect(path.getPoint(1).distanceTo(points[2])).toBeLessThan(1e-9);
    const middle = path.getPointAt(0.5);
    expect(middle.distanceTo(new Vector3(10, 0, 0))).toBeGreaterThan(0.5);
    expect(path.getLength()).toBeLessThan(routeLength(points));
    expect(path.getLength()).toBeGreaterThan(routeLength(points) - 2);
  });

  it('keeps a straight run straight', () => {
    const path = roundedRoute(
      toVectors([
        [0, 0, 0],
        [0, 5, 0],
      ]),
      3,
    );
    expect(path.getLength()).toBeCloseTo(5, 6);
  });
});
