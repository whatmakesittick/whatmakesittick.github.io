import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { SideId } from '../../ids';

export const X_AXIS = new Vector3(1, 0, 0);
export const Y_AXIS = new Vector3(0, 1, 0);
export const Z_AXIS = new Vector3(0, 0, 1);

const euler = new Euler();
const basis = new Matrix4();

export function sideSign(side: SideId): number {
  return side === 'right' ? 1 : -1;
}

export function fromEuler(x: number, y: number, z: number, order: 'ZXY' | 'YXZ'): Quaternion {
  return new Quaternion().setFromEuler(euler.set(x, y, z, order));
}

export function toEuler(rotation: Quaternion, order: 'ZXY' | 'YXZ'): Euler {
  return new Euler().setFromQuaternion(rotation, order);
}

export function about(axis: Vector3, angle: number): Quaternion {
  return new Quaternion().setFromAxisAngle(axis, angle);
}

export function mirror(rotation: Quaternion, side: SideId): Quaternion {
  return side === 'right'
    ? rotation.clone()
    : new Quaternion(-rotation.x, -rotation.y, rotation.z, rotation.w);
}

export function mirrorPoint(point: Vector3, side: SideId): Vector3 {
  return side === 'right' ? point.clone() : new Vector3(point.x, point.y, -point.z);
}

export function fromBasis(x: Vector3, y: Vector3, z: Vector3): Quaternion {
  return new Quaternion().setFromRotationMatrix(basis.makeBasis(x, y, z));
}

export function apply(rotation: Quaternion, x: number, y: number, z: number): Vector3 {
  return new Vector3(x, y, z).applyQuaternion(rotation);
}

export function relative(parent: Quaternion, child: Quaternion): Quaternion {
  return parent.clone().invert().multiply(child);
}

export function perpendicular(vector: Vector3, to: Vector3): Vector3 {
  return vector.clone().addScaledVector(to, -vector.dot(to)).normalize();
}
