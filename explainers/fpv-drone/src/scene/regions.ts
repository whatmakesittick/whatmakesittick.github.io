import type { Box3 } from 'three';
import { regionFromSpec } from '@core/scene/regions';
import type { RegionId } from '../ids';
import { CROSSROADS_BOUNDS, ROUTE_BOUNDS, SCENE_BOUNDS, STATION_BOUNDS } from '../model/layout';
import type { Box } from '../model/layout';

export type StaticRegionId = Exclude<RegionId, 'drone'>;

export const STATIC_REGION_SPECS: Readonly<Record<StaticRegionId, Box>> = {
  scene: SCENE_BOUNDS,
  station: STATION_BOUNDS,
  crossroads: CROSSROADS_BOUNDS,
  route: ROUTE_BOUNDS,
};

export function staticRegions(): Record<StaticRegionId, Box3> {
  return {
    scene: regionFromSpec(STATIC_REGION_SPECS.scene),
    station: regionFromSpec(STATIC_REGION_SPECS.station),
    crossroads: regionFromSpec(STATIC_REGION_SPECS.crossroads),
    route: regionFromSpec(STATIC_REGION_SPECS.route),
  };
}
