import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { ISOCENTRE, SCREEN } from '../model/layout';
import { buildRegions } from './regions';

describe('regions', () => {
  it('builds a box per region from the layout', () => {
    const regions = buildRegions();
    expect(Object.keys(regions).sort()).toEqual(
      ['bore', 'console', 'layers', 'room', 'scanner', 'voxel'].sort(),
    );
    expect(regions.bore.containsPoint(new Vector3(...ISOCENTRE))).toBe(true);
    expect(regions.room.containsBox(regions.scanner)).toBe(true);
    expect(regions.console.containsPoint(new Vector3(...SCREEN.centre))).toBe(true);
  });
});
