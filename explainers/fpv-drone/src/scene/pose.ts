import type { Object3D } from 'three';
import type { FlightReading } from '../ids';
import { DRONE } from '../model/layout';
import { droneUnits } from '../model/scale';

export const DRONE_EULER_ORDER = 'YZX';

export function applyDronePose(object: Object3D, flight: FlightReading): void {
  const [x, y, z] = flight.position;
  object.position.set(x, y + droneUnits(DRONE.restHeight), z);
  object.rotation.set(flight.roll, -flight.heading, -flight.pitch, DRONE_EULER_ORDER);
}
