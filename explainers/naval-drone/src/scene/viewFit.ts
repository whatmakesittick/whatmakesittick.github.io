import { Euler, Vector3 } from 'three';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import type { Point } from '../ids';
import { BOAT_EULER_ORDER } from './pose';

export interface BoatFrame {
  position: Point;
  heading: number;
  trim: number;
}

export interface DistanceRange {
  min: number;
  max: number;
}

export interface PolarLimits {
  maxPolarAngle: number;
  maxDistance: number | null;
}

const UP = new Vector3(0, 1, 0);
const SOLVE_STEPS = 32;
const POLAR_SLACK = 0.005;

export function vectorOf(point: Point): Vector3 {
  return new Vector3(point[0], point[1], point[2]);
}

export function direction(azimuth: number, elevation: number): Vector3 {
  const level = Math.cos(elevation);
  return new Vector3(level * Math.cos(azimuth), Math.sin(elevation), level * Math.sin(azimuth));
}

export function boatToWorld(frame: BoatFrame, point: Point, pitched: boolean): Vector3 {
  const rotation = new Euler(0, -frame.heading, pitched ? frame.trim : 0, BOAT_EULER_ORDER);
  return vectorOf(point).applyEuler(rotation).add(vectorOf(frame.position));
}

export function fitDistance(width: number, slopes: FramingSlopes): number {
  return width / (2 * slopes.horizontal);
}

export function fitsView(
  pose: CameraPose,
  points: readonly Vector3[],
  slopes: FramingSlopes,
  fill: number,
): boolean {
  const forward = pose.target.clone().sub(pose.position).normalize();
  const right = forward.clone().cross(UP).normalize();
  const up = right.clone().cross(forward);
  return points.every((point) => {
    const offset = point.clone().sub(pose.position);
    const depth = offset.dot(forward);
    if (depth <= 0) return false;
    const across = Math.abs(offset.dot(right)) / depth;
    const rise = Math.abs(offset.dot(up)) / depth;
    return across <= slopes.horizontal * fill && rise <= slopes.vertical * fill;
  });
}

export function nearestFit(
  poseAt: (distance: number) => CameraPose,
  fits: (pose: CameraPose) => boolean,
  range: DistanceRange,
): CameraPose {
  if (fits(poseAt(range.min))) return poseAt(range.min);
  let low = range.min;
  let high = range.max;
  for (let step = 0; step < SOLVE_STEPS; step += 1) {
    const middle = (low + high) / 2;
    if (fits(poseAt(middle))) high = middle;
    else low = middle;
  }
  return poseAt(high);
}

export function polarOf(pose: CameraPose): number {
  return pose.position.clone().sub(pose.target).angleTo(UP);
}

export function lookUpLimits(
  pose: CameraPose,
  defaultMaxPolar: number,
  seaClearance: number,
): PolarLimits {
  const polar = polarOf(pose);
  if (polar <= defaultMaxPolar) return { maxPolarAngle: defaultMaxPolar, maxDistance: null };
  const limit = polar + POLAR_SLACK;
  return { maxPolarAngle: limit, maxDistance: (pose.target.y - seaClearance) / -Math.cos(limit) };
}
