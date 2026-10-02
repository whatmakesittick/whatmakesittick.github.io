import { describe, expect, it } from 'vitest';
import { Route, arc, line, rampedShare } from './path';

const START = { x: 0, z: 0, heading: 0 };

describe('Route', () => {
  it('runs a line along its heading', () => {
    const route = new Route(START, [line(10)]);
    expect(route.poseAt(0.5)).toMatchObject({ x: 5, z: 0, heading: 0 });
  });

  it('turns a half circle to face the other way one diameter across', () => {
    const route = new Route(START, [arc(4, Math.PI)]);
    expect(route.end.x).toBeCloseTo(0, 6);
    expect(route.end.z).toBeCloseTo(8, 6);
    expect(route.end.heading).toBeCloseTo(Math.PI, 6);
    expect(route.length).toBeCloseTo(4 * Math.PI, 6);
  });

  it('turns the other way for a negative turn', () => {
    const route = new Route(START, [arc(4, -Math.PI / 2)]);
    expect(route.end.x).toBeCloseTo(4, 6);
    expect(route.end.z).toBeCloseTo(-4, 6);
  });

  it('chains steps from where the last one ended', () => {
    const route = new Route(START, [line(10), arc(5, Math.PI / 2), line(10)]);
    expect(route.end.x).toBeCloseTo(15, 6);
    expect(route.end.z).toBeCloseTo(15, 6);
  });

  it('reports the turn direction of the step at a share', () => {
    const route = new Route(START, [line(10), arc(5, Math.PI / 2), arc(5, -Math.PI / 2)]);
    expect(route.turnAt(0.1)).toBe(0);
    expect(route.turnAt(0.5)).toBe(1);
    expect(route.turnAt(0.9)).toBe(-1);
  });
});

describe('rampedShare', () => {
  it('covers the whole route from start to end', () => {
    expect(rampedShare(0, 0.2, 0.2)).toBe(0);
    expect(rampedShare(1, 0.2, 0.2)).toBeCloseTo(1, 9);
  });

  it('starts from rest with a ramp in and stops with a ramp out', () => {
    const step = 1e-4;
    expect(rampedShare(step, 0.2, 0) / step).toBeLessThan(0.01);
    expect((1 - rampedShare(1 - step, 0, 0.2)) / step).toBeLessThan(0.01);
  });

  it('moves at constant speed without ramps', () => {
    expect(rampedShare(0.3, 0, 0)).toBeCloseTo(0.3, 9);
  });
});
