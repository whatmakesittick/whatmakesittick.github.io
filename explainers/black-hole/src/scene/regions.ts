import { Box3, Vector3 } from 'three';
import { regionFromSpec } from '@core/scene/regions';
import type { RegionId } from '../ids';
import { PROBE_CLOSE_HALF_SIZE, REGIONS } from './layout';

const HALF_TO_FULL = 2;

export function probeCloseRegion(centre: Vector3): Box3 {
  const size = new Vector3().setScalar(PROBE_CLOSE_HALF_SIZE * HALF_TO_FULL);
  return new Box3().setFromCenterAndSize(centre, size);
}

export function localRegion(id: RegionId, probeCentre: Vector3): Box3 {
  return id === 'probeClose' ? probeCloseRegion(probeCentre) : regionFromSpec(REGIONS[id]);
}
