import { describe, expect, it } from 'vitest';
import {
  COLLECT_PATH,
  DROPLET_PATH,
  EXPOSE_BOUNCE_SHARES,
  EXPOSE_PATH,
  MASK_BOUNCE_SHARES,
  MASK_PATH,
  legLengths,
  lightSeconds,
  pathLength,
  pointOnPath,
} from './path';

describe('path', () => {
  it('measures the section 3 legs', () => {
    expect(pathLength(DROPLET_PATH)).toBeCloseTo(1.4, 9);
    expect(pathLength(COLLECT_PATH)).toBeCloseTo(3.79, 2);
    expect(pathLength(MASK_PATH)).toBeCloseTo(6.77, 2);
    expect(pathLength(EXPOSE_PATH)).toBeCloseTo(6.17, 2);
  });

  it('turns lengths into light flight times in nanoseconds', () => {
    expect(lightSeconds(COLLECT_PATH) * 1e9).toBeCloseTo(12.65, 1);
    expect(lightSeconds(MASK_PATH) * 1e9).toBeCloseTo(22.59, 1);
    expect(lightSeconds(EXPOSE_PATH) * 1e9).toBeCloseTo(20.57, 1);
  });

  it('sums the legs to the length', () => {
    expect(legLengths(MASK_PATH)).toHaveLength(5);
    expect(legLengths(MASK_PATH).reduce((a, b) => a + b, 0)).toBeCloseTo(pathLength(MASK_PATH), 9);
  });

  it('walks the path with a unit direction', () => {
    const start = pointOnPath(COLLECT_PATH, 0);
    const end = pointOnPath(COLLECT_PATH, 1);
    expect(start.position).toEqual(COLLECT_PATH[0]);
    expect(end.position[0]).toBeCloseTo(COLLECT_PATH[2][0], 9);
    expect(Math.hypot(...pointOnPath(MASK_PATH, 0.5).direction)).toBeCloseTo(1, 9);
    expect(pointOnPath(DROPLET_PATH, 0.5).direction).toEqual([0, -1, 0]);
  });

  it('clamps the share', () => {
    expect(pointOnPath(MASK_PATH, 2).position).toEqual(MASK_PATH[MASK_PATH.length - 1]);
  });

  it('reaches eleven mirrors in order', () => {
    const all = [...MASK_BOUNCE_SHARES, ...EXPOSE_BOUNCE_SHARES];
    expect(all).toHaveLength(11);
    expect(MASK_BOUNCE_SHARES[4]).toBeCloseTo(1, 9);
    expect(EXPOSE_BOUNCE_SHARES[5]).toBeLessThan(1);
  });
});
