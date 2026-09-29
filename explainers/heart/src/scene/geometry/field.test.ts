import { describe, expect, it } from 'vitest';
import {
  blend,
  capsule,
  carve,
  cylinder,
  ellipsoid,
  gradient,
  projectOnto,
  roundCone,
  smoothMax,
  smoothMin,
  squashed,
  sweptTube,
  union,
} from './field';

describe('signed distance fields', () => {
  it('measures a sphere exactly and an ellipsoid along its axes', () => {
    const sphere = ellipsoid([0, 0, 0], [10, 10, 10]);
    expect(sphere.distance(15, 0, 0)).toBeCloseTo(5, 5);
    expect(sphere.distance(0, 0, 0)).toBeLessThan(0);
    const long = ellipsoid([0, 0, 0], [5, 20, 5]);
    expect(long.distance(0, 20, 0)).toBeCloseTo(0, 5);
    expect(long.distance(5, 0, 0)).toBeCloseTo(0, 5);
  });

  it('turns an ellipsoid to follow its long axis', () => {
    const tilted = ellipsoid([0, 0, 0], [4, 20, 4], [1, 0, 0]);
    expect(tilted.distance(20, 0, 0)).toBeCloseTo(0, 4);
    expect(tilted.distance(0, 20, 0)).toBeGreaterThan(10);
  });

  it('measures round cones, capsules and flat ended cylinders', () => {
    const cone = roundCone([0, 0, 0], [0, 20, 0], 5, 2);
    expect(cone.distance(5, 0, 0)).toBeCloseTo(0, 1);
    expect(cone.distance(0, 23, 0)).toBeCloseTo(1, 1);
    expect(capsule([0, 0, 0], [10, 0, 0], 3).distance(5, 3, 0)).toBeCloseTo(0, 5);
    const can = cylinder([0, 0, 0], [0, 10, 0], 4);
    expect(can.distance(0, 12, 0)).toBeCloseTo(2, 5);
    expect(can.distance(6, 5, 0)).toBeCloseTo(2, 5);
    expect(can.distance(0, 5, 0)).toBeLessThan(0);
  });

  it('sweeps a tapering tube along a polyline without bulges at the joints', () => {
    const tube = sweptTube(
      [
        [0, 0, 0],
        [0, 10, 0],
        [0, 20, 0],
      ],
      [4, 3, 2],
    );
    expect(tube.distance(4, 0, 0)).toBeCloseTo(0, 5);
    expect(tube.distance(3, 10, 0)).toBeCloseTo(0, 5);
    expect(tube.distance(2.5, 15, 0)).toBeCloseTo(0, 1);
    expect(tube.distance(0, 25, 0)).toBeCloseTo(3, 5);
  });

  it('keeps boxes that enclose every shape', () => {
    const shapes = [
      ellipsoid([3, 4, 5], [6, 8, 2], [1, 1, 0]),
      roundCone([0, 0, 0], [10, 5, 0], 3, 1),
      cylinder([0, 0, 0], [0, 0, 9], 2),
    ];
    for (const shape of shapes) {
      const { min, max } = shape.box;
      for (let sample = 0; sample < 200; sample += 1) {
        const x = min[0] - 5 + Math.random() * (max[0] - min[0] + 10);
        const y = min[1] - 5 + Math.random() * (max[1] - min[1] + 10);
        const z = min[2] - 5 + Math.random() * (max[2] - min[2] + 10);
        const inside =
          x >= min[0] && x <= max[0] && y >= min[1] && y <= max[1] && z >= min[2] && z <= max[2];
        if (!inside) expect(shape.distance(x, y, z)).toBeGreaterThan(-1e-6);
      }
    }
  });

  it('blends shapes into one smooth surface with a fillet', () => {
    const a = ellipsoid([-6, 0, 0], [5, 5, 5]);
    const b = ellipsoid([6, 0, 0], [5, 5, 5]);
    const hard = union([a, b]);
    const soft = blend([a, b], 6);
    expect(hard.distance(0, 0, 0)).toBeGreaterThan(0);
    expect(soft.distance(0, 0, 0)).toBeLessThan(hard.distance(0, 0, 0));
    expect(soft.distance(20, 0, 0)).toBeCloseTo(hard.distance(20, 0, 0), 5);
  });

  it('takes the deepest of overlapping shapes inside a union', () => {
    const outer = ellipsoid([0, 0, 0], [10, 10, 10]);
    const inner = ellipsoid([9.5, 0, 0], [1, 1, 1]);
    expect(outer.distance(9.5, 0, 0)).toBeGreaterThan(-1);
    expect(union([inner, outer]).distance(9.5, 0, 0)).toBeCloseTo(-1, 5);
    expect(union([outer, inner]).distance(9.5, 0, 0)).toBeCloseTo(-1, 5);
  });

  it('carves one shape out of another', () => {
    const block = ellipsoid([0, 0, 0], [10, 10, 10]);
    const hole = capsule([0, 0, 0], [0, 20, 0], 3);
    const carved = carve(block, [hole], 1);
    expect(carved.distance(0, 5, 0)).toBeGreaterThan(0);
    expect(carved.distance(6, 0, 0)).toBeLessThan(0);
  });

  it('squashes a shape along an axis', () => {
    const flat = squashed(ellipsoid([0, 0, 0], [10, 10, 10]), [1, 1, 0.5]);
    expect(flat.distance(0, 0, 5)).toBeCloseTo(0, 4);
    expect(flat.distance(10, 0, 0)).toBeCloseTo(0, 4);
  });

  it('smooths the minimum and maximum symmetrically', () => {
    expect(smoothMin(1, 5, 2)).toBe(1);
    expect(smoothMin(1, 1, 2)).toBeLessThan(1);
    expect(smoothMax(1, 1, 2)).toBeGreaterThan(1);
    expect(smoothMin(1, 1, 0)).toBe(1);
  });

  it('finds the outward direction and projects points onto the surface', () => {
    const sphere = ellipsoid([0, 0, 0], [10, 10, 10]);
    const [gx, gy, gz] = gradient(sphere, 0, 12, 0);
    expect(gy).toBeCloseTo(1, 3);
    expect(Math.abs(gx) + Math.abs(gz)).toBeLessThan(1e-3);
    const projected = projectOnto(sphere, [0, 0, 18]);
    expect(Math.hypot(...projected)).toBeCloseTo(10, 3);
  });
});
