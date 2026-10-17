import { Quaternion, Vector3 } from 'three';
import type { Object3D } from 'three';

const PLUME_AXIS = new Vector3(0, 1, 0);
const SIDE_HINT = new Vector3(0, 1, 0);
const SIDE_FALLBACK = new Vector3(1, 0, 0);
const PARALLEL = 0.9;

export interface Mouth {
  position: Vector3;
  axis: Vector3;
  side: Vector3;
  lift: Vector3;
}

export function mouthInCar(car: Object3D, nozzle: Object3D): Mouth {
  const turn = car.getWorldQuaternion(new Quaternion()).invert();
  turn.multiply(nozzle.getWorldQuaternion(new Quaternion()));
  const axis = PLUME_AXIS.clone().applyQuaternion(turn).normalize();
  const hint = Math.abs(axis.dot(SIDE_HINT)) < PARALLEL ? SIDE_HINT : SIDE_FALLBACK;
  const side = new Vector3().crossVectors(axis, hint).normalize();
  return {
    position: car.worldToLocal(nozzle.getWorldPosition(new Vector3())),
    axis,
    side,
    lift: new Vector3().crossVectors(axis, side),
  };
}
