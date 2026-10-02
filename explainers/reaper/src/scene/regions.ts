import type { Box3 } from 'three';
import { regionFromSpec } from '@core/scene/regions';
import type { RegionId } from '../ids';
import { AIRFIELD_BOUNDS, SCENE_BOUNDS, TARGET_BOUNDS } from '../model/layout';
import type { Box } from '../model/layout';

export type StaticRegionId = Exclude<RegionId, 'aircraft'>;

export const STATIC_REGION_SPECS: Readonly<Record<StaticRegionId, Box>> = {
  scene: SCENE_BOUNDS,
  airfield: AIRFIELD_BOUNDS,
  target: TARGET_BOUNDS,
};

export function staticRegions(): Record<StaticRegionId, Box3> {
  return {
    scene: regionFromSpec(STATIC_REGION_SPECS.scene),
    airfield: regionFromSpec(STATIC_REGION_SPECS.airfield),
    target: regionFromSpec(STATIC_REGION_SPECS.target),
  };
}
