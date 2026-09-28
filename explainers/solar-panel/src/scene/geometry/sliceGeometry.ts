import type { Extent } from '../../model';
import { FINGER_UM, MODULE, SLICE_LIFT_CM, SLICE_UM, layerTopUm, um } from '../../model';
import { around } from './blocks';
import { sliceCorner } from './moduleLayout';

export const SLICE_SIZE = {
  width: um(SLICE_UM.width),
  depth: um(SLICE_UM.depth),
  height: um(layerTopUm('pyramids')),
} as const;

export const SLICE_FRONT_Y = -SLICE_SIZE.depth / 2;

export function sliceOrigin(): { x: number; y: number; z: number } {
  const corner = sliceCorner();
  return { x: corner.x, y: corner.y, z: MODULE.depth + SLICE_LIFT_CM };
}

export function fingerSpan(): Extent {
  return around(um(FINGER_UM.x), um(FINGER_UM.width));
}

export function fingerTopCm(): number {
  return um(layerTopUm('arCoating') + FINGER_UM.height);
}
