import { Euler, Vector3 } from 'three';
import { RAMP_LENGTH, rampPitch, rampPoint } from '../../../model/layout';
import { CAR_EULER_ORDER } from '../../pose';

export interface RampFrame {
  readonly distance: number;
  readonly centre: Vector3;
  readonly tangent: Vector3;
  readonly normal: Vector3;
  readonly side: Vector3;
}

const euler = new Euler();

export function rampFrame(distance: number): RampFrame {
  euler.set(0, 0, rampPitch(distance), CAR_EULER_ORDER);
  return {
    distance,
    centre: new Vector3(...rampPoint(distance)),
    tangent: new Vector3(1, 0, 0).applyEuler(euler),
    normal: new Vector3(0, 1, 0).applyEuler(euler),
    side: new Vector3(0, 0, 1).applyEuler(euler),
  };
}

export function framePoint(
  frame: RampFrame,
  across: number,
  depth: number,
  target = new Vector3(),
): Vector3 {
  return target
    .copy(frame.centre)
    .addScaledVector(frame.side, across)
    .addScaledVector(frame.normal, depth);
}

export function rampSurfacePoint(distance: number, across: number, depth = 0): Vector3 {
  return framePoint(rampFrame(distance), across, depth);
}

export function rampFrames(count: number, from = 0, to = RAMP_LENGTH): RampFrame[] {
  return Array.from({ length: count + 1 }, (_, index) =>
    rampFrame(from + ((to - from) * index) / count),
  );
}
