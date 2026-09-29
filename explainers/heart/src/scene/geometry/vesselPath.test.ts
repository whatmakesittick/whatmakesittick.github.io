import { describe, expect, it } from 'vitest';
import {
  distanceAlong,
  pointAtDistance,
  portalAt,
  radiusAt,
  routeCurve,
  routeField,
} from './vesselPath';

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

  it('builds a smooth tube field along the route', () => {
    const tube = routeField(ROUTE, 20, 0);
    expect(tube.distance(0, 15, 0)).toBeLessThan(0);
    expect(tube.distance(15, 15, 0)).toBeGreaterThan(0);
    expect(tube.distance(radiusAt(ROUTE, 15), 15, 0)).toBeCloseTo(0, 1);
  });

  it('can start the tube field part way along the route', () => {
    const tail = routeField(ROUTE, 30, 0, 12);
    expect(tail.distance(0, 2, 0)).toBeGreaterThan(0);
    expect(tail.distance(0, 20, 0)).toBeLessThan(0);
  });

  it('narrows a route toward a branch radius', () => {
    const narrowing = { ...ROUTE, narrowing: { atMm: 20, lengthMm: 10, radius: 5 } };
    expect(radiusAt(narrowing, 15)).toBe(10);
    expect(radiusAt(narrowing, 25)).toBeGreaterThan(5);
    expect(radiusAt(narrowing, 25)).toBeLessThan(10);
    expect(radiusAt(narrowing, 40)).toBe(5);
  });

  it('measures how far along a route a point lies', () => {
    expect(distanceAlong(ROUTE.points, [0, 20, 0])).toBeCloseTo(20, 0);
  });
});
