import type { Object3D } from 'three';
import type { BoatReading, PlaningReading } from '../ids';

export const BOAT_EULER_ORDER = 'YZX';

export function applyBoatPose(
  object: Object3D,
  boat: Pick<BoatReading, 'position' | 'heading'>,
  planing: Pick<PlaningReading, 'heave' | 'trim'>,
): void {
  const [x, y, z] = boat.position;
  object.position.set(x, y + planing.heave, z);
  object.rotation.set(0, -boat.heading, planing.trim, BOAT_EULER_ORDER);
}
