import type { Box3 } from 'three';
import type { Object3D } from 'three';
import { regionFromSpec } from '@core/scene/regions';
import type { RegionId } from '../ids';
import { BOAT_BOUNDS, SCENE_BOUNDS, SHORE_BOUNDS } from '../model/layout';
import { SHIP_BOUNDS } from '../model/run';

export function staticRegions(): Readonly<Record<Exclude<RegionId, 'boat'>, Box3>> {
  return {
    scene: regionFromSpec(SCENE_BOUNDS),
    ship: regionFromSpec(SHIP_BOUNDS),
    shore: regionFromSpec(SHORE_BOUNDS),
  };
}

const LOCAL_BOAT = regionFromSpec(BOAT_BOUNDS);

export function boatRegion(boat: Object3D, target: Box3): Box3 {
  boat.updateMatrixWorld(true);
  return target.copy(LOCAL_BOAT).applyMatrix4(boat.matrixWorld);
}
