import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { REGION_IDS } from '../ids';
import type { RegionId } from '../ids';
import {
  ANCHOR_POINTS,
  DESK,
  GANTRY,
  GRID_LINE,
  REGION_SPECS,
  SUBSTATION_YARD,
  boxCentre,
  boxSpan,
} from '../model';
import type { FixedAnchorId } from '../model';
import {
  LINE_IN_VIEW_M,
  VIEW_REGION_IDS,
  VIEW_REGION_SPECS,
  buildRegions,
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

const HELD_ANCHORS: readonly (readonly [RegionId, FixedAnchorId])[] = [
  ['rack', 'subjectRack'],
  ['rack', 'inset'],
  ['rack', 'chip'],
  ['coolingPlant', 'cdu'],
  ['coolingPlant', 'roof'],
  ['lineUp', 'lineUp'],
];

describe('regions', () => {
  const regions = buildRegions();

  it('spans a filled box for every region', () => {
    REGION_IDS.forEach((id) => {
      const size = regions[id].getSize(new Vector3());
      expect(Math.min(size.x, size.y, size.z), id).toBeGreaterThan(0);
    });
  });

  it('holds each scene anchor in the region framed around it', () => {
    HELD_ANCHORS.forEach(([region, anchor]) =>
      expect(regions[region].containsPoint(new Vector3(...ANCHOR_POINTS[anchor])), anchor).toBe(
        true,
      ),
    );
  });

  it('frames the whole campus around every other region', () => {
    REGION_IDS.forEach((id) => expect(regions.campus.containsBox(regions[id]), id).toBe(true));
    expect(regions.campus.containsPoint(new Vector3(...boxCentre(GANTRY)))).toBe(true);
    expect(regions.powerYard.containsPoint(new Vector3(...boxCentre(SUBSTATION_YARD)))).toBe(true);
    expect(regions.lineUp.containsPoint(new Vector3(...boxCentre(DESK)))).toBe(true);
  });

  it('hands out fresh boxes every time', () => {
    const first = buildRegions();
    first.campus.expandByScalar(1);
    expect(buildRegions().campus.equals(first.campus)).toBe(false);
  });
});
