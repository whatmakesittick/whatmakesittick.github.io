import { toRadians } from '@core/math';
import { BODY_DEPTH_M, HEAD_UP_LIFT_M, HEAD_UP_PITCH_DEG } from '../model/scale';

export interface BodyPose {
  x: number;
  y: number;
  pitchRad: number;
}

export function bodyPose(headUpShare: number, surgeM: number): BodyPose {
  return {
    x: surgeM,
    y: -BODY_DEPTH_M - headUpShare * HEAD_UP_LIFT_M,
    pitchRad: toRadians(HEAD_UP_PITCH_DEG * headUpShare),
  };
}
