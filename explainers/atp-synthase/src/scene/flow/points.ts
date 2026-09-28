import { toRadians } from '@core/math';

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export interface BeadPose {
  readonly position: Point3;
  scale: number;
}

export function point(x = 0, y = 0, z = 0): Point3 {
  return { x, y, z };
}

export function beadPose(): BeadPose {
  return { position: point(), scale: 0 };
}

export function setPolar(out: Point3, azimuthDeg: number, radius: number, y: number): Point3 {
  const azimuth = toRadians(azimuthDeg);
  out.x = radius * Math.cos(azimuth);
  out.y = y;
  out.z = -radius * Math.sin(azimuth);
  return out;
}

export function polarPoint(azimuthDeg: number, radius: number, y: number): Point3 {
  return setPolar(point(), azimuthDeg, radius, y);
}

export function setLerp(out: Point3, from: Point3, to: Point3, share: number): Point3 {
  out.x = from.x + (to.x - from.x) * share;
  out.y = from.y + (to.y - from.y) * share;
  out.z = from.z + (to.z - from.z) * share;
  return out;
}

export function copyPoint(out: Point3, from: Point3): Point3 {
  out.x = from.x;
  out.y = from.y;
  out.z = from.z;
  return out;
}

export function hide(pose: BeadPose): BeadPose {
  pose.scale = 0;
  return pose;
}
