import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { regionFromSpec } from '@core/scene/regions';
import { REGION_IDS } from '../ids';
import type { RegionId } from '../ids';
import {
  ANCHOR_POINTS,
  BATTERIES,
  CHILLER,
  DESK,
  DRY_COOLERS,
  GANTRY,
  GENSETS,
  GRID_LINE,
  PLUME_TOP,
  REGION_SPECS,
  ROOF_Y,
  SUBJECT_CDU,
  SUBJECT_RACK_BOX,
  SUBSTATION_YARD,
  SWITCHGEAR,
  TRANSFORMERS,
  UPS,
  boxCentre,
  boxSpan,
  jouleAt,
} from '../model';
import type { BoxSpec, FixedAnchorId } from '../model';
import {
  GENSETS_IN_VIEW,
  VIEW_REGION_IDS,
  VIEW_REGION_SPECS,
  buildRegions,
  framedRegionSpec,
  isAssemblyRegion,
} from './regions';

function expectHolds(id: 'yardAndRoom' | 'coolingLoop', boxes: readonly BoxSpec[]): void {
  const region = regionFromSpec(VIEW_REGION_SPECS[id]);
  boxes.forEach((box) => {
    const { x, z } = boxSpan(box);
    [x[0], x[1]].forEach((pointX) =>
      [z[0], z[1]].forEach((pointZ) =>
        expect(region.containsPoint(new Vector3(pointX, region.min.y, pointZ)), id).toBe(true),
      ),
    );
  });
}

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

  it('stretches the campus west to where the joule starts and up to the roof plant', () => {
    const { campusAndLine } = VIEW_REGION_SPECS;
    const { campus } = REGION_SPECS;
    expect(campusAndLine.x).toEqual([GRID_LINE.fromX, campus.x[1]]);
    expect(campusAndLine.x[0]).toBeLessThanOrEqual(jouleAt(0, 'liquid').position[0]);
    expect(campusAndLine.z).toEqual(campus.z);
    expect(campusAndLine.y[1]).toBeGreaterThan(ROOF_Y);
    expect(campusAndLine.y[1]).toBeLessThan(PLUME_TOP[1]);
  });

  it('holds the transformers, the electrical room and the nearest gensets in the yard view', () => {
    const shown = [
      ...TRANSFORMERS,
      UPS,
      BATTERIES,
      SWITCHGEAR,
      ...GENSETS.slice(0, GENSETS_IN_VIEW),
    ];
    expectHolds('yardAndRoom', shown);
  });

  it('holds the subject rack, its CDU and the roof plant in the cooling view, below the plume top', () => {
    expectHolds('coolingLoop', [SUBJECT_RACK_BOX, SUBJECT_CDU, CHILLER, ...DRY_COOLERS]);
    expect(VIEW_REGION_SPECS.coolingLoop.y[1]).toBeLessThan(PLUME_TOP[1]);
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
