import { Matrix4, Vector3 } from 'three';
import type { RestFrame } from '@core/figure/body/restFrame';
import type { SideId } from '../../../../ids';
import { DROP_RAD } from '../../../rig/shoe';

const UP = new Vector3(0, 1, 0);
const JOINTS = {
  right: { ankle: 'r_foot', ball: 'r_ball' },
  left: { ankle: 'l_foot', ball: 'l_ball' },
} as const;

export function lateralSign(side: SideId): number {
  return side === 'right' ? 1 : -1;
}

export function restOutsoleFrame(frame: RestFrame, side: SideId, toRig: Matrix4): Matrix4 {
  const ankle = frame.joint(JOINTS[side].ankle).applyMatrix4(toRig);
  const ball = frame.joint(JOINTS[side].ball).applyMatrix4(toRig);
  const forward = ball.sub(ankle).setY(0).normalize();
  const right = new Vector3().crossVectors(forward, UP);
  const bare = new Matrix4().makeBasis(forward, UP, right).setPosition(ankle);
  return bare.multiply(new Matrix4().makeRotationZ(DROP_RAD));
}
