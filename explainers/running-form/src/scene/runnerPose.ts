import type { Vector3 } from 'three';
import type { SideId } from '../ids';

interface RunnerArmJoints {
  shoulder: Vector3;
  elbow: Vector3;
  wrist: Vector3;
}

interface RunnerLegJoints {
  hip: Vector3;
  knee: Vector3;
  ankle: Vector3;
  heel: Vector3;
  ball: Vector3;
  toe: Vector3;
  contact: Vector3 | null;
}

export interface RunnerPose {
  pelvis: Vector3;
  chest: Vector3;
  headCentre: Vector3;
  headTop: Vector3;
  trunkForward: Vector3;
  trunkUp: Vector3;
  arms: Record<SideId, RunnerArmJoints>;
  legs: Record<SideId, RunnerLegJoints>;
}
