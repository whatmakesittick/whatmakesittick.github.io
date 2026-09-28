import { Vector2 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  CAP_EDGE,
  bandLoop,
  capGeometry,
  containsPoint,
  counterClockwise,
  signedArea,
  triangleCount,
} from './cap';

function circle(radius: number, count = 48, centre = new Vector2()): Vector2[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    return new Vector2(centre.x + radius * Math.cos(angle), centre.y + radius * Math.sin(angle));
  });
}

describe('cut face caps', () => {
  it('knows orientation and containment', () => {
    const loop = circle(5);
    expect(signedArea(loop)).toBeGreaterThan(0);
    expect(signedArea(counterClockwise([...loop].reverse()))).toBeGreaterThan(0);
    expect(containsPoint(loop, new Vector2(1, 1))).toBe(true);
    expect(containsPoint(loop, new Vector2(6, 0))).toBe(false);
  });

  it('pushes a band outward from a hole without reaching its neighbours', () => {
    const hole = circle(5);
    const wall = circle(6);
    const band = bandLoop(hole, [wall], { bandMm: 2, bandShare: 0.35 });
    band.forEach((point, index) => {
      expect(point.length()).toBeGreaterThan(hole[index].length());
      expect(point.length()).toBeLessThan(5.5);
    });
  });

  it('fills the wall between an outline and its holes, facing the viewer', () => {
    const { geometry, edge } = capGeometry(
      [circle(20)],
      [circle(5, 32, new Vector2(-8, 0)), circle(4, 32, new Vector2(9, 0))],
      {
        bandMm: 1,
        bandShare: 0.35,
      },
    );
    expect(triangleCount(geometry)).toBeGreaterThan(64);
    expect(edge).toContain(CAP_EDGE.outer);
    expect(edge).toContain(CAP_EDGE.cavity);
    expect(edge).toContain(CAP_EDGE.band);
    const positions = geometry.getAttribute('position').array;
    const index = geometry.getIndex()?.array ?? [];
    let area = 0;
    for (let t = 0; t < index.length; t += 3) {
      const [a, b, c] = [index[t] * 3, index[t + 1] * 3, index[t + 2] * 3];
      const cross =
        (positions[b] - positions[a]) * (positions[c + 1] - positions[a + 1]) -
        (positions[b + 1] - positions[a + 1]) * (positions[c] - positions[a]);
      expect(cross).toBeGreaterThanOrEqual(0);
      area += cross / 2;
    }
    const expected = Math.PI * (400 - 25 - 16);
    expect(area).toBeGreaterThan(expected * 0.95);
    expect(area).toBeLessThan(expected * 1.02);
  });
});
