import { BODY_HEIGHT } from './config.ts';
import type { Source } from './source.ts';
import { centroid, type Vec } from './vec.ts';

export interface Shape {
  readonly positions: Float64Array;
  readonly triangles: number[];
  readonly joint: (name: string) => Vec;
}

const RIGHT_SHOULDER_JOINT = 'upperarm01.R____head';
const LEFT_SHOULDER_JOINT = 'upperarm01.L____head';

function applyTargets(source: Source): Float64Array {
  const positions = Float64Array.from(source.base.positions);
  for (const { target, deltas } of source.targets) {
    for (let i = 0; i < positions.length; i++) positions[i] += deltas[i] * target.weight;
  }
  return positions;
}

function toSwimmerAxes(positions: Float64Array, rightSign: number): void {
  for (let i = 0; i < positions.length; i += 3) {
    const [x, y, z] = [positions[i], positions[i + 1], positions[i + 2]];
    positions[i] = y;
    positions[i + 1] = -z;
    positions[i + 2] = rightSign * x;
  }
}

function flipWinding(triangles: number[]): void {
  for (let i = 0; i < triangles.length; i += 3)
    [triangles[i + 1], triangles[i + 2]] = [triangles[i + 2], triangles[i + 1]];
}

function usedRange(positions: Float64Array, triangles: number[]): [number, number] {
  let lowest = Infinity;
  let highest = -Infinity;
  for (const index of triangles) {
    lowest = Math.min(lowest, positions[index * 3]);
    highest = Math.max(highest, positions[index * 3]);
  }
  return [lowest, highest];
}

export function shapeBody(source: Source): Shape {
  const positions = applyTargets(source);
  const joints = source.skeleton.joints;
  const jointAt = (name: string): Vec => centroid(positions, joints[name]);
  const rightSign = jointAt(RIGHT_SHOULDER_JOINT)[0] > jointAt(LEFT_SHOULDER_JOINT)[0] ? 1 : -1;
  toSwimmerAxes(positions, rightSign);
  const triangles = [...source.base.triangles];
  if (rightSign > 0) flipWinding(triangles);

  const [lowest, highest] = usedRange(positions, triangles);
  const factor = BODY_HEIGHT / (highest - lowest);
  const origin: Vec = [0, 0, 0];
  const shoulders = [RIGHT_SHOULDER_JOINT, LEFT_SHOULDER_JOINT].map((name) =>
    centroid(positions, joints[name]),
  );
  for (const shoulder of shoulders)
    for (let k = 0; k < 3; k++) origin[k] += shoulder[k] / shoulders.length;
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) positions[i + k] = (positions[i + k] - origin[k]) * factor;
  }
  return { positions, triangles, joint: (name) => centroid(positions, joints[name]) };
}
