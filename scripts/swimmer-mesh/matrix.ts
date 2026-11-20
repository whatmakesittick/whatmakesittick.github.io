import { add, cross, dot, normalize, scale, sub, type Vec } from './vec.ts';

export type Mat3 = readonly number[];

export interface Rigid {
  readonly r: Mat3;
  readonly t: Vec;
}

export const IDENTITY: Rigid = { r: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] };
const MIRROR_Z: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, -1];
const MIRROR_SIGN = [1, 1, -1];

export function degrees(value: number): number {
  return (value * Math.PI) / 180;
}

export function rotate(r: Mat3, v: ArrayLike<number>): Vec {
  return [
    r[0] * v[0] + r[1] * v[1] + r[2] * v[2],
    r[3] * v[0] + r[4] * v[1] + r[5] * v[2],
    r[6] * v[0] + r[7] * v[1] + r[8] * v[2],
  ];
}

function multiply(a: Mat3, b: Mat3): number[] {
  return Array.from({ length: 9 }, (_, i) => {
    const [row, column] = [Math.floor(i / 3), i % 3];
    return a[row * 3] * b[column] + a[row * 3 + 1] * b[3 + column] + a[row * 3 + 2] * b[6 + column];
  });
}

export function axisAngle(axis: ArrayLike<number>, angle: number): Mat3 {
  const [x, y, z] = normalize(axis);
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  const k = 1 - c;
  return [
    c + x * x * k,
    x * y * k - z * s,
    x * z * k + y * s,
    y * x * k + z * s,
    c + y * y * k,
    y * z * k - x * s,
    z * x * k - y * s,
    z * y * k + x * s,
    c + z * z * k,
  ];
}

export function turnAbout(axis: ArrayLike<number>, angle: number, pivot: Vec): Rigid {
  const r = axisAngle(axis, angle);
  return { r, t: sub(pivot, rotate(r, pivot)) };
}

export function compose(outer: Rigid, inner: Rigid): Rigid {
  return { r: multiply(outer.r, inner.r), t: add(rotate(outer.r, inner.t), outer.t) };
}

export function transformPoint(rigid: Rigid, p: ArrayLike<number>): Vec {
  return add(rotate(rigid.r, p), rigid.t);
}

export function mirrorRigid(rigid: Rigid): Rigid {
  const r = multiply(MIRROR_Z, multiply(rigid.r, MIRROR_Z));
  return { r, t: rigid.t.map((value, k) => value * MIRROR_SIGN[k]) as Vec };
}

export function signedAngle(from: Vec, to: Vec, axis: Vec): number {
  const unit = normalize(axis);
  return Math.atan2(dot(cross(from, to), unit), dot(from, to));
}

export function arcBetween(from: Vec, to: Vec): { axis: Vec; angle: number } {
  const axis = cross(from, to);
  const angle = Math.atan2(Math.hypot(...axis), dot(from, to));
  return { axis: scale(axis, 1 / (Math.hypot(...axis) || 1)), angle };
}
