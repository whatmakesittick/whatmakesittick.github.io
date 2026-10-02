import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  CRUISE_ALTITUDE,
  GROUND_STATION,
  LOS_MAST,
  RUNWAY,
  SATELLITE_POSITION,
  TARGET,
} from '../model/layout';
import { staticRegions } from './regions';

describe('static regions', () => {
  it('hold the airfield, the target and the whole flight', () => {
    const regions = staticRegions();
    expect(regions.airfield.containsPoint(new Vector3(RUNWAY.x[0], 1, RUNWAY.z))).toBe(true);
    expect(
      regions.airfield.containsPoint(new Vector3(GROUND_STATION[0], 1, GROUND_STATION[2])),
    ).toBe(true);
    expect(
      regions.airfield.containsPoint(new Vector3(LOS_MAST.position[0], 1, LOS_MAST.position[2])),
    ).toBe(true);
    expect(regions.target.containsPoint(new Vector3(TARGET[0], 1, TARGET[2]))).toBe(true);
    expect(regions.scene.max.y).toBeGreaterThan(CRUISE_ALTITUDE);
    expect(regions.scene.containsBox(regions.airfield)).toBe(true);
    expect(SATELLITE_POSITION[1]).toBeGreaterThan(regions.scene.max.y);
  });

  it('hands out fresh boxes every time', () => {
    const first = staticRegions();
    first.scene.expandByScalar(100);
    expect(staticRegions().scene.equals(first.scene)).toBe(false);
  });
});
