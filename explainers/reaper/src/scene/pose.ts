import type { Object3D } from 'three';
import type { FlightReading } from '../ids';

export const AIRCRAFT_EULER_ORDER = 'YZX';

export function applyFlightPose(object: Object3D, flight: FlightReading): void {
  const [x, y, z] = flight.position;
  object.position.set(x, y, z);
  object.rotation.set(flight.bank, -flight.heading, flight.pitch, AIRCRAFT_EULER_ORDER);
}
