import type { DetailId } from '../ids';
import { COARSE_POINTER_QUERY, ROW_LOD_DISTANCE_M } from './constants';

export function detailFor(cameraDistance: number, coarsePointer: boolean): DetailId {
  return coarsePointer || cameraDistance > ROW_LOD_DISTANCE_M ? 'far' : 'near';
}

export function isCoarsePointer(): boolean {
  return globalThis.matchMedia?.(COARSE_POINTER_QUERY).matches ?? false;
}
