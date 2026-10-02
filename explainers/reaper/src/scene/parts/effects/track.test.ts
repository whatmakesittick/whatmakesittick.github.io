import { describe, expect, it } from 'vitest';
import { ROUTE_LENGTH } from '../../../model/flight';
import { CRUISE_ALTITUDE, LOITER, ROLLOUT_END_X, THRESHOLD } from '../../../model/layout';
import { TRACK } from '../../constants';
import { routePoints } from './track';

describe('track route', () => {
  it('runs from the threshold to the roll-out stop, climbing to the cruise altitude between', () => {
    const points = routePoints(TRACK.step);
    const first = points[0];
    const last = points[points.length - 1];
    expect(first.x).toBeCloseTo(THRESHOLD[0]);
    expect(first.distance).toBe(0);
    expect(last.distance).toBeCloseTo(ROUTE_LENGTH);
    expect(last.x).toBeCloseTo(ROLLOUT_END_X);
    expect(Math.max(...points.map((point) => point.y))).toBeCloseTo(CRUISE_ALTITUDE + TRACK.lift);
  });

  it('circles the loiter centre on station', () => {
    const points = routePoints(TRACK.step).filter((point) => point.y > CRUISE_ALTITUDE);
    const onCircle = points.filter(
      (point) =>
        Math.abs(
          Math.hypot(point.x - LOITER.centre[0], point.z - LOITER.centre[1]) - LOITER.radius,
        ) < 0.5,
    );
    expect(onCircle.length).toBeGreaterThan(points.length / 3);
  });
});
