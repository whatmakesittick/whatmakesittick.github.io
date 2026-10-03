import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CROSSROADS, ORBIT_HEIGHT, PAD, STATION } from '../model/layout';
import { staticRegions } from './regions';

describe('static regions', () => {
  it('hold the station, the pad, the crossroads and the whole flight', () => {
    const regions = staticRegions();
    expect(regions.station.containsPoint(new Vector3(...STATION).setY(1))).toBe(true);
    expect(regions.station.containsPoint(new Vector3(...PAD).setY(1))).toBe(true);
    expect(regions.crossroads.containsPoint(new Vector3(...CROSSROADS).setY(1))).toBe(true);
    expect(regions.route.containsPoint(new Vector3(...CROSSROADS).setY(ORBIT_HEIGHT))).toBe(true);
    expect(regions.scene.max.y).toBeGreaterThan(ORBIT_HEIGHT);
    expect(regions.scene.containsBox(regions.station)).toBe(true);
    expect(regions.scene.containsBox(regions.crossroads)).toBe(true);
  });

  it('hands out fresh boxes every time', () => {
    const first = staticRegions();
    first.scene.expandByScalar(100);
    expect(staticRegions().scene.equals(first.scene)).toBe(false);
  });
});
