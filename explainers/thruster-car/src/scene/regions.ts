import { Box3, Vector3 } from 'three';
import type { Object3D } from 'three';
import { regionFromSpec } from '@core/scene/regions';
import type { CarRegionId, SiteRegionId } from '../ids';
import { CAR_REGIONS, SITE_REGIONS } from '../model/layout';

const lowCorner = new Vector3();
const highCorner = new Vector3();

export function staticRegions(): Record<SiteRegionId, Box3> {
  return {
    site: regionFromSpec(SITE_REGIONS.site),
    ramp: regionFromSpec(SITE_REGIONS.ramp),
    arc: regionFromSpec(SITE_REGIONS.arc),
  };
}

export function carRegion(id: CarRegionId, car: Object3D, target = new Box3()): Box3 {
  const { x, y, z } = CAR_REGIONS[id];
  car.updateWorldMatrix(true, false);
  lowCorner.set(x[0], y[0], z[0]);
  highCorner.set(x[1], y[1], z[1]);
  return target.set(lowCorner, highCorner).applyMatrix4(car.matrixWorld);
}
