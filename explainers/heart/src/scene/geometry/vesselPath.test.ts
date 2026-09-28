import { describe, expect, it } from 'vitest';
import { pointAtDistance, portalAt, radiusAt, routeCurve, routeField } from './vesselPath';

const ROUTE = {
  points: [
    [0, 0, 0],
    [0, 20, 0],
    [0, 40, 10],
  ] as const,
  radius: 10,
  rootRadius: 6,
  flareMm: 10,
};

describe('vessel routes', () => {
  it('flares from the root radius to the full radius', () => {
    expect(radiusAt(ROUTE, 0)).toBe(6);
    expect(radiusAt(ROUTE, 5)).toBeGreaterThan(6);
    expect(radiusAt(ROUTE, 5)).toBeLessThan(10);
    expect(radiusAt(ROUTE, 20)).toBe(10);
  });

  it('walks the route by distance', () => {
    const curve = routeCurve(ROUTE);
    expect(pointAtDistance(curve, 0).y).toBeCloseTo(0, 5);
    expect(pointAtDistance(curve, 10).y).toBeCloseTo(10, 0);
  });

  it('places a portal across the route with the samples beyond it', () => {
    const portal = portalAt(ROUTE, 10, 1);
    expect(portal.centre[1]).toBeCloseTo(10, 0);
    expect(portal.normal[1]).toBeCloseTo(1, 2);
    expect(portal.radius).toBeCloseTo(radiusAt(ROUTE, 10) - 1, 5);
    expect(portal.beyond[0][1]).toBeCloseTo(10, 0);
  });

  it('builds a solid tube field along the route', () => {
    const pieces = routeField(ROUTE, 20, 0);
    expect(pieces.length).toBeGreaterThan(1);
    const inside = Math.min(...pieces.map((piece) => piece.distance(0, 15, 0)));
    const outside = Math.min(...pieces.map((piece) => piece.distance(15, 15, 0)));
    expect(inside).toBeLessThan(0);
    expect(outside).toBeGreaterThan(0);
  });
});
