import { Vector3 } from 'three';
import { SUN_DIR } from '../model/layout';

export const SUN_VECTOR = new Vector3(...SUN_DIR).normalize();
export const COT_SUN = Math.hypot(SUN_DIR[0], SUN_DIR[2]) / SUN_DIR[1];

export function shadowReachZ(heightM: number): number {
  return (heightM * Math.abs(SUN_DIR[2])) / SUN_DIR[1];
}
