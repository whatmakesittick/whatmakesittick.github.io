import { describe, expect, it } from 'vitest';
import { MODULE } from '../model';
import {
  HOUSE_REGION,
  INVERTER_REGION,
  MOUNTING_REGION,
  moduleRegion,
  regionIn,
  sliceRegion,
  stackRegion,
} from './regions';

describe('regions', () => {
  it('keeps the equipment and the mounting inside the house', () => {
    const house = regionIn(HOUSE_REGION);
    expect(house.containsBox(regionIn(INVERTER_REGION))).toBe(true);
    expect(house.containsBox(regionIn(MOUNTING_REGION))).toBe(true);
  });

  it('covers the whole module and grows the stack as it explodes', () => {
    const module = regionIn(moduleRegion());
    expect(module.max.y - module.min.y).toBeCloseTo(MODULE.height, 6);
    const closed = regionIn(stackRegion(0, 35));
    const open = regionIn(stackRegion(1, 35));
    expect(open.max.z).toBeGreaterThan(closed.max.z + 40);
    expect(open.min.y).toBeLessThan(closed.min.y);
  });

  it('frames the slice section on the face the camera sees', () => {
    const south = regionIn(sliceRegion(-1));
    const north = regionIn(sliceRegion(1));
    expect(south.max.y).toBeLessThan(0);
    expect(north.min.y).toBeGreaterThan(0);
  });
});
