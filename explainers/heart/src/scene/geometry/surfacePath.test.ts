import { describe, expect, it } from 'vitest';
import { ellipsoid } from './field';
import { castOnto, hugSurface, surfaceCurve, surfacePoint } from './surfacePath';

const BALL = ellipsoid([0, 0, 0], [20, 20, 20]);

describe('surface paths', () => {
  it('casts a ray onto the surface', () => {
    const hit = castOnto(BALL, [0, 0, 100], [0, 0, -1]);
    expect(hit?.[2]).toBeCloseTo(20, 1);
    expect(castOnto(BALL, [50, 0, 100], [0, 0, -1])).toBeNull();
  });

  it('finds marks from each side', () => {
    expect(surfacePoint(BALL, { view: 'front', at: [0, 0] })[2]).toBeCloseTo(20, 1);
    expect(surfacePoint(BALL, { view: 'back', at: [0, 0] })[2]).toBeCloseTo(-20, 1);
    expect(surfacePoint(BALL, { view: 'left', at: [0, 0] })[0]).toBeCloseTo(20, 1);
    expect(surfacePoint(BALL, { view: 'right', at: [0, 0] })[0]).toBeCloseTo(-20, 1);
    expect(surfacePoint(BALL, { view: 'below', at: [0, 0] })[1]).toBeCloseTo(-20, 1);
  });

  it('hugs the surface at a chosen height along a curve', () => {
    const curve = surfaceCurve(BALL, [
      { view: 'front', at: [-10, 0] },
      { view: 'front', at: [10, 5] },
    ]);
    const points = hugSurface(BALL, curve, () => 1.5);
    for (const point of points) expect(point.length()).toBeCloseTo(21.5, 1);
  });
});
