import { Color } from 'three';
import { describe, expect, it } from 'vitest';
import { PAD, STATION, TREELINE } from '../../../model/layout';
import { FIELD, ROADS, SHRUBS, TREES } from '../../constants';
import { PAINT } from '../../finishes';
import { fieldColour } from './field';
import { scatterShrubs } from './shrubs';
import { treeSpots } from './trees';

function apart(a: Color, b: Color): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

describe('field colour', () => {
  it('mixes the field between grass and straw with worn patches', () => {
    const grass = new Color(PAINT.grass);
    const straw = new Color(PAINT.straw);
    const samples = Array.from({ length: 200 }, (_, index) =>
      fieldColour(
        FIELD.extent.x[0] + ((index * 37) % (FIELD.extent.x[1] - FIELD.extent.x[0])),
        FIELD.extent.z[0] + ((index * 53) % (FIELD.extent.z[1] - FIELD.extent.z[0])),
        new Color(),
      ),
    );
    const greens = samples.filter((colour) => apart(colour, grass) < 0.05).length;
    const yellows = samples.filter((colour) => apart(colour, straw) < 0.08).length;
    expect(greens).toBeGreaterThan(20);
    expect(yellows).toBeGreaterThan(5);
  });
});

describe('treeline', () => {
  it('lines the far side of the field in two rows of conifers and poplars', () => {
    const spots = treeSpots();
    expect(spots.length).toBeGreaterThan(80);
    for (const spot of spots) {
      expect(spot.x).toBeGreaterThanOrEqual(TREELINE.x[0] - 5);
      expect(spot.x).toBeLessThanOrEqual(TREELINE.x[1] + 5);
      expect(Math.abs(spot.z - TREELINE.z)).toBeLessThan(20);
      expect(spot.height).toBeGreaterThanOrEqual(TREES.conifer.height[0]);
    }
    const poplars = spots.filter((spot) => spot.poplar).length;
    expect(poplars / spots.length).toBeGreaterThan(0.2);
    expect(poplars / spots.length).toBeLessThan(0.5);
  });
});

describe('shrubs', () => {
  it('scatters over the field but keeps off the station, the pad and the roads', () => {
    const shrubs = scatterShrubs();
    expect(shrubs.length).toBe(SHRUBS.count);
    for (const shrub of shrubs) {
      expect(shrub.x).toBeGreaterThanOrEqual(SHRUBS.area.x[0]);
      expect(shrub.x).toBeLessThanOrEqual(SHRUBS.area.x[1]);
      expect(Math.hypot(shrub.x - STATION[0], shrub.z - STATION[2])).toBeGreaterThan(5);
      expect(Math.hypot(shrub.x - PAD[0], shrub.z - PAD[2])).toBeGreaterThan(5);
      expect(Math.abs(shrub.z - ROADS.along.z)).toBeGreaterThan(ROADS.halfWidth);
      expect(Math.abs(shrub.x - ROADS.across.x)).toBeGreaterThan(ROADS.halfWidth);
    }
  });
});
