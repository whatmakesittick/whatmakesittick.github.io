import type { Extent } from '@core/scene/regions';
import {
  COMPUTE_TRAY_PITCH,
  LOWER_COMPUTE_TRAYS,
  RACK_STACK,
  SHELVES_PER_GROUP,
  SUBJECT_RACK,
  SUBJECT_RACK_BOX,
  SUBJECT_TRAY_INDEX,
  SWITCH_TRAYS,
  UPPER_COMPUTE_TRAYS,
  boxSpan,
} from '../../../model';

const SLAB_GAP_M = 0.004;
const TRAY_WIDTH_M = 0.44;
const TRAY_REAR_Z = 1.54;

export const SPAN = boxSpan(SUBJECT_RACK_BOX);
export const [RACK_X, , RACK_Z] = SUBJECT_RACK;
export const [FRONT_Z, REAR_Z] = SPAN.z;
export const SKIN_M = 0.012;
export const POST_M = 0.035;
export const DOOR_M = 0.015;
export const CAP_M = 0.04;
export const RAIL_M = 0.03;
export const BASE_TOP = RACK_STACK.base[1];

export function around(centre: number, size: number): Extent {
  return [centre - size / 2, centre + size / 2];
}

export function stack([from, to]: Extent, count: number, pitch = (to - from) / count): Extent[] {
  return Array.from({ length: count }, (_, index) => [
    from + index * pitch + SLAB_GAP_M,
    from + (index + 1) * pitch - SLAB_GAP_M,
  ]);
}

export function height([from, to]: Extent): number {
  return to - from;
}

export function middle([from, to]: Extent): number {
  return (from + to) / 2;
}

export const TRAY_X = around(RACK_X, TRAY_WIDTH_M);
export const BEZEL_X: Extent = [SPAN.x[0] + SKIN_M + POST_M, SPAN.x[1] - SKIN_M - POST_M];
export const BEZEL_Z: Extent = [FRONT_Z + 2 * DOOR_M, FRONT_Z + 3 * DOOR_M];
export const TRAY_Z: Extent = [BEZEL_Z[1], TRAY_REAR_Z];

export const SHELF_BANDS = [RACK_STACK.lowerShelves, RACK_STACK.upperShelves].flatMap((band) =>
  stack(band, SHELVES_PER_GROUP),
);
export const COMPUTE_BANDS = [
  ...stack(RACK_STACK.lowerCompute, LOWER_COMPUTE_TRAYS),
  ...stack(RACK_STACK.upperCompute, UPPER_COMPUTE_TRAYS, COMPUTE_TRAY_PITCH),
];
export const SWITCH_BANDS = stack(RACK_STACK.switchTrays, SWITCH_TRAYS);
export const SUBJECT_BAND = COMPUTE_BANDS[LOWER_COMPUTE_TRAYS + SUBJECT_TRAY_INDEX];
export const TRAY_HEIGHT = height(COMPUTE_BANDS[0]);
