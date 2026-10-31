import type { Box3 } from 'three';
import { regionFromSpec } from '@core/scene/regions';
import type { RegionSpec } from '@core/scene/regions';
import { REGION_IDS } from '../ids';
import type { RegionId } from '../ids';
import { REGION_SPECS } from '../model';

export const LINE_IN_VIEW_M = 18;

export const VIEW_REGION_IDS = ['campusAndLine'] as const;
export type ViewRegionId = (typeof VIEW_REGION_IDS)[number];
export type FramedRegionId = RegionId | ViewRegionId;

const CAMPUS = REGION_SPECS.campus;

export const VIEW_REGION_SPECS: Readonly<Record<ViewRegionId, RegionSpec>> = {
  campusAndLine: { ...CAMPUS, x: [CAMPUS.x[0] - LINE_IN_VIEW_M, CAMPUS.x[1]] },
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
