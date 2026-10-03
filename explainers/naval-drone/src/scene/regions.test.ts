import { Group, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { GROUND_STATION, SLIPWAY } from '../model/layout';
import { ROUTE_END, SHIP_CENTRE } from '../model/run';
import { boatRegion, staticRegions } from './regions';

describe('regions', () => {
  it('hold the shore, the ship and the whole run', () => {
    const regions = staticRegions();
    expect(regions.shore.containsPoint(new Vector3(SLIPWAY.x[0], 1, 0))).toBe(true);
    expect(regions.shore.containsPoint(new Vector3(...GROUND_STATION))).toBe(true);
    expect(regions.ship.containsPoint(new Vector3(SHIP_CENTRE[0], 5, SHIP_CENTRE[2]))).toBe(true);
    expect(regions.scene.containsPoint(new Vector3(ROUTE_END[0], 0, ROUTE_END[2]))).toBe(true);
    expect(regions.scene.containsBox(regions.ship)).toBe(true);
  });

  it('follows the posed boat', () => {
    const boat = new Group();
    boat.position.set(100, 0.2, -30);
    const box = boatRegion(boat, staticRegions().scene.clone());
    expect(box.containsPoint(boat.position)).toBe(true);
    expect(box.max.x - box.min.x).toBeLessThan(7);
  });
});
