import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { TARGET } from '../../model/layout';
import { IMPACT_UNITS, LAUNCH_POINT, LAUNCH_UNITS } from '../../model/strike';
import { missileClock, missileDirection, missilePosition, railShare } from './missilePath';

const RAIL = new Vector3(0.3, -0.5, 4.5);

describe('missile path', () => {
  it('counts the flight from launch to impact', () => {
    expect(missileClock(LAUNCH_UNITS)).toBe(0);
    expect(missileClock(IMPACT_UNITS)).toBe(1);
    expect(missileClock(LAUNCH_UNITS - 1)).toBeLessThan(0);
  });

  it('leaves from the rail and ends on the target', () => {
    const start = missilePosition(0, RAIL, new Vector3());
    expect(start.distanceTo(new Vector3(...LAUNCH_POINT).add(RAIL))).toBeCloseTo(0);
    expect(missilePosition(1, RAIL, new Vector3()).distanceTo(new Vector3(...TARGET))).toBeCloseTo(
      0,
    );
    expect(railShare(0)).toBe(1);
    expect(railShare(0.5)).toBe(0);
  });

  it('points along its path, downward toward the target at the end', () => {
    const late = missileDirection(0.95, RAIL, new Vector3());
    expect(late.length()).toBeCloseTo(1);
    expect(late.y).toBeLessThan(-0.5);
    const position = missilePosition(0.95, RAIL, new Vector3());
    const toTarget = new Vector3(...TARGET).sub(position).normalize();
    expect(late.dot(toTarget)).toBeGreaterThan(0.95);
  });
});
