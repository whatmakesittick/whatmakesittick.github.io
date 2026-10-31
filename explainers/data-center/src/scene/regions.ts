import type { Box3 } from 'three';
import { regionFromSpec } from '@core/scene/regions';
import type { RegionSpec } from '@core/scene/regions';
import { REGION_IDS } from '../ids';
import type { RegionId } from '../ids';
import {
  BUILDING,
  DRY_COOLER,
  GENSETS,
  GRID_LINE,
  GROUND_Y,
  REGION_SPECS,
  ROOF_Y,
  TRANSFORMER,
  TRANSFORMERS,
  boxSpan,
} from '../model';

export const GENSETS_IN_VIEW = 3;
export const PLUME_IN_VIEW_M = 2;

export const VIEW_REGION_IDS = ['campusAndLine', 'yardAndRoom', 'coolingLoop'] as const;
export type ViewRegionId = (typeof VIEW_REGION_IDS)[number];
export type FramedRegionId = RegionId | ViewRegionId;

const CAMPUS = REGION_SPECS.campus;
const POWER_YARD = REGION_SPECS.powerYard;
const COOLING_PLANT = REGION_SPECS.coolingPlant;
const ROOF_PLANT_TOP_Y = ROOF_Y + DRY_COOLER.height;
const TRANSFORMERS_WEST_X = Math.min(...TRANSFORMERS.map((box) => boxSpan(box).x[0]));
const SHOWN_GENSETS_EAST_X = Math.max(
  ...GENSETS.slice(0, GENSETS_IN_VIEW).map((box) => boxSpan(box).x[1]),
);

export const VIEW_REGION_SPECS: Readonly<Record<ViewRegionId, RegionSpec>> = {
  campusAndLine: {
    x: [GRID_LINE.fromX, CAMPUS.x[1]],
    y: [GROUND_Y, ROOF_PLANT_TOP_Y],
    z: CAMPUS.z,
  },
  yardAndRoom: {
    x: [TRANSFORMERS_WEST_X, SHOWN_GENSETS_EAST_X],
    y: [GROUND_Y, TRANSFORMER.height],
    z: [POWER_YARD.z[0], BUILDING.z[1]],
  },
  coolingLoop: { ...COOLING_PLANT, y: [GROUND_Y, ROOF_PLANT_TOP_Y + PLUME_IN_VIEW_M] },
};

export function isAssemblyRegion(id: FramedRegionId): id is RegionId {
  return (REGION_IDS as readonly string[]).includes(id);
}

export function framedRegionSpec(id: FramedRegionId): RegionSpec {
  return isAssemblyRegion(id) ? REGION_SPECS[id] : VIEW_REGION_SPECS[id];
}

export function buildRegions(): Record<RegionId, Box3> {
  return Object.fromEntries(
    REGION_IDS.map((id) => [id, regionFromSpec(REGION_SPECS[id])]),
  ) as Record<RegionId, Box3>;
}
