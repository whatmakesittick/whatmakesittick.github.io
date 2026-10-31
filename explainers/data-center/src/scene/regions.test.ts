import { describe, expect, it } from 'vitest';
import { REGION_IDS } from '../ids';
import { GANTRY, GRID_LINE, REGION_SPECS, boxSpan } from '../model';
import {
  LINE_IN_VIEW_M,
  VIEW_REGION_IDS,
  VIEW_REGION_SPECS,
  framedRegionSpec,
  isAssemblyRegion,
} from './regions';

describe('framed regions', () => {
  it('reads the assembly regions from the frozen layout', () => {
    REGION_IDS.forEach((id) => {
      expect(isAssemblyRegion(id), id).toBe(true);
      expect(framedRegionSpec(id), id).toBe(REGION_SPECS[id]);
    });
  });

  it('keeps the extra view regions apart from the assembly ones', () => {
    VIEW_REGION_IDS.forEach((id) => {
      expect(isAssemblyRegion(id), id).toBe(false);
      expect(framedRegionSpec(id), id).toBe(VIEW_REGION_SPECS[id]);
    });
  });

  it('stretches the campus west over the last stretch of the grid line', () => {
    const { campusAndLine } = VIEW_REGION_SPECS;
    const { campus } = REGION_SPECS;
    expect(campusAndLine.x[0]).toBe(boxSpan(GANTRY).x[0] - LINE_IN_VIEW_M);
    expect(campusAndLine.x[0]).toBeGreaterThan(GRID_LINE.fromX);
    expect(campusAndLine.x[1]).toBe(campus.x[1]);
    expect(campusAndLine.y).toEqual(campus.y);
    expect(campusAndLine.z).toEqual(campus.z);
  });
});
