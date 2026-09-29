import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  collarGeometry,
  collarLoop,
  loopNormal,
  loopPoints,
  resampleLoop,
  smoothLoop,
} from './collar';

function circle(radius: number, count: number): Vector3[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    return new Vector3(radius * Math.cos(angle), 0, radius * Math.sin(angle));
  });
}

const STYLE = { radiusMm: 1, radialSegments: 6, spacingMm: 1, smoothing: 2 };

describe('junction collars', () => {
  it('finds the normal of a loop', () => {
    expect(Math.abs(loopNormal(circle(5, 24)).y)).toBeCloseTo(1, 5);
  });

  it('smooths jagged loops and spaces their points evenly', () => {
    const jagged = circle(5, 48).map((point, index) => point.multiplyScalar(index % 2 ? 1.1 : 0.9));
    const smooth = smoothLoop(jagged, 4);
    const spread = (points: Vector3[]) =>
      Math.max(...points.map((point) => point.length())) -
      Math.min(...points.map((point) => point.length()));
    expect(spread(smooth)).toBeLessThan(spread(jagged) / 2);
    const even = resampleLoop(circle(5, 12), 1);
    const gaps = even.map((point, index) => point.distanceTo(even[(index + 1) % even.length]));
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(0.05);
    expect(collarLoop(circle(5, 12), STYLE).length).toBeGreaterThan(20);
  });

  it('wraps a closed ring tube around the loop', () => {
    const loop = circle(5, 20);
    const geometry = collarGeometry(loop, STYLE, '#ff0000');
    expect(geometry.getAttribute('position').count).toBe(20 * 6);
    expect(geometry.getIndex()?.count).toBe(20 * 6 * 6);
    const positions = geometry.getAttribute('position').array;
    const reach = Math.hypot(positions[0], positions[2]);
    expect(Math.abs(reach - 5)).toBeLessThanOrEqual(1.0001);
    expect(loopPoints(loop)).toHaveLength(21);
  });
});
