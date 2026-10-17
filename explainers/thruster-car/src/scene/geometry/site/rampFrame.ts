import { Euler, Vector3 } from 'three';
import { rampPitch, rampPoint, rampRoll } from '../../../model/layout';
import { CAR_EULER_ORDER } from '../../pose';

export interface RampFrame {
  readonly u: number;
  readonly centre: Vector3;
  readonly tangent: Vector3;
  readonly normal: Vector3;
  readonly side: Vector3;
}

export interface RampLocal {
  u: number;
  across: number;
  depth: number;
}

const ARC_SAMPLES = 512;
const SEARCH_STEPS = 40;

const euler = new Euler();
const offset = new Vector3();

export function rampFrame(u: number): RampFrame {
  euler.set(rampRoll(u), 0, rampPitch(u), CAR_EULER_ORDER);
  return {
    u,
    centre: new Vector3(...rampPoint(u)),
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

export function rampSurfacePoint(u: number, across: number, depth = 0): Vector3 {
  return framePoint(rampFrame(u), across, depth);
}

function buildArcTable(): Float64Array {
  const table = new Float64Array(ARC_SAMPLES + 1);
  let previous = new Vector3(...rampPoint(0));
  for (let index = 1; index <= ARC_SAMPLES; index += 1) {
    const point = new Vector3(...rampPoint(index / ARC_SAMPLES));
    table[index] = table[index - 1] + point.distanceTo(previous);
    previous = point;
  }
  return table;
}

let arcTable: Float64Array | undefined;

function arcLengths(): Float64Array {
  arcTable ??= buildArcTable();
  return arcTable;
}

export function rampArcLength(u: number): number {
  const table = arcLengths();
  const position = Math.min(Math.max(u, 0), 1) * ARC_SAMPLES;
  const index = Math.min(Math.floor(position), ARC_SAMPLES - 1);
  return table[index] + (table[index + 1] - table[index]) * (position - index);
}

export function rampLength(): number {
  return arcLengths()[ARC_SAMPLES];
}

export function rampU(arcLength: number): number {
  const table = arcLengths();
  let low = 0;
  let high = ARC_SAMPLES;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (table[middle] <= arcLength) low = middle;
    else high = middle;
  }
  const span = table[high] - table[low];
  const share = span > 0 ? (arcLength - table[low]) / span : 0;
  return Math.min(Math.max((low + share) / ARC_SAMPLES, 0), 1);
}

function alongOffset(point: Vector3, u: number): number {
  const frame = rampFrame(u);
  return offset.subVectors(point, frame.centre).dot(frame.tangent);
}

export function rampLocal(point: Vector3): RampLocal | null {
  let low = 0;
  let high = 1;
  if (alongOffset(point, low) < 0 || alongOffset(point, high) > 0) return null;
  for (let step = 0; step < SEARCH_STEPS; step += 1) {
    const middle = (low + high) / 2;
    if (alongOffset(point, middle) > 0) low = middle;
    else high = middle;
  }
  const frame = rampFrame((low + high) / 2);
  offset.subVectors(point, frame.centre);
  return { u: frame.u, across: offset.dot(frame.side), depth: offset.dot(frame.normal) };
}
