import { Vector3 } from 'three';
import { SUN_ARC_RADIUS_CM, SUNRISE_MIN, SUNSET_MIN, sunDirection } from '../../model';
import { ARC_CENTRE } from '../constants';

const ARC_ORIGIN = new Vector3(ARC_CENTRE.x, ARC_CENTRE.y, ARC_CENTRE.z);

export function sunPosition(minute: number, target = new Vector3()): Vector3 {
  const [x, y, z] = sunDirection(minute);
  return target.set(x, y, z).multiplyScalar(SUN_ARC_RADIUS_CM).add(ARC_ORIGIN);
}

export function arcPoints(stepMinutes: number): Vector3[] {
  const points: Vector3[] = [];
  for (let minute = SUNRISE_MIN; minute <= SUNSET_MIN; minute += stepMinutes) {
    points.push(sunPosition(minute));
  }
  return points;
}
