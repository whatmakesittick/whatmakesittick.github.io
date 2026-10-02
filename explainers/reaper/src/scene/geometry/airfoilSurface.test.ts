import { describe, expect, it } from 'vitest';
import { boundsOf } from './testing';
import {
  airfoilLoop,
  airfoilSurface,
  camberShape,
  loopCoordinate,
  thicknessShape,
} from './airfoilSurface';

describe('airfoil shape', () => {
  it('is thickest near a third of the chord and closes at both edges', () => {
    expect(thicknessShape(0)).toBe(0);
    expect(thicknessShape(1)).toBeCloseTo(0, 3);
    expect(thicknessShape(0.3)).toBeCloseTo(0.5, 1);
  });

  it('peaks its camber at forty percent of the chord', () => {
    expect(camberShape(0)).toBe(0);
    expect(camberShape(0.4)).toBeCloseTo(1);
    expect(camberShape(1)).toBeCloseTo(0);
  });

  it('runs around the section from the upper trailing edge back along the lower side', () => {
    const loop = airfoilLoop(8);
    expect(loop.length).toBe(16);
    expect(loop[0].fraction).toBe(1);
    expect(loopCoordinate(loop[0])).toBe(0);
    expect(loopCoordinate(loop[8])).toBe(0.5);
    expect(loop[12].thickness).toBeLessThan(0);
  });
});

describe('airfoilSurface', () => {
  it('lofts a tapered panel between two stations', () => {
    const loop = airfoilLoop(10);
    const station = (z: number, chord: number) => ({
      leadingEdge: [0, 0, z] as const,
      chordAxis: [-1, 0, 0] as const,
      normalAxis: [0, 1, 0] as const,
      chord,
      thickness: 0.12,
      camber: 0,
    });
    const panel = airfoilSurface([station(0, 2), station(5, 1)], loop);
    const box = boundsOf(panel);
    expect(box.min.x).toBeCloseTo(-2);
    expect(box.max.z).toBeCloseTo(5);
    expect(box.max.y).toBeCloseTo(0.12, 2);
  });
});
