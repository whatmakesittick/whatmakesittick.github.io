import { Vector3 } from 'three';
import type { Object3D } from 'three';
import type { CarReading } from '../ids';
import { CAR } from '../model/layout';
import { metres } from '../model/scale';

export const CAR_EULER_ORDER = 'YZX';

const lift = new Vector3();

export function applyCarPose(object: Object3D, car: CarReading): void {
  const [x, y, z] = car.position;
  object.rotation.set(car.roll, 0, car.pitch, CAR_EULER_ORDER);
  lift.set(0, metres(CAR.rideHeight), 0).applyEuler(object.rotation);
  object.position.set(x + lift.x, y + lift.y, z + lift.z);
}
