import { smoothstep } from '@core/math';
import { TURBINE_LAND, terrainHeight } from '../../../model/layout';

export function heroGroundHeight(x: number, z: number): number {
  const distance = Math.hypot(x, z);
  const share = smoothstep(
    distance,
    TURBINE_LAND.flatRadius,
    TURBINE_LAND.flatRadius + TURBINE_LAND.blendRadius,
  );
  return terrainHeight(x, z) * share;
}
