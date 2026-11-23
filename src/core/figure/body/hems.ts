import { Vector3 } from 'three';
import type { Figure } from '@core/figure';
import type { RestFrame } from './restFrame';

const AXES = 3;

export const RIGHT_X = -1;

export interface VertexFields {
  readonly distances: Float32Array;
  readonly extents: Float32Array;
}

export type FieldWriter = (
  point: Vector3,
  distances: Float32Array,
  extents: Float32Array,
  at: number,
) => void;

export function axisBetween(frame: RestFrame, from: string, to: string): Vector3 {
  return frame.joint(to).sub(frame.joint(from)).normalize();
}

export function along(point: Vector3, origin: Vector3, axis: Vector3, scratch: Vector3): number {
  return scratch.copy(point).sub(origin).dot(axis);
}

export function azimuthOf(point: Vector3, centre: Vector3): number {
  return Math.abs(Math.atan2(point.x - centre.x, point.z - centre.z));
}

export function isRightSide(point: Vector3): boolean {
  return point.x * RIGHT_X > 0;
}

export function vertexFields(figure: Figure, channels: number, write: FieldWriter): VertexFields {
  const distances = new Float32Array(figure.vertexCount * channels);
  const extents = new Float32Array(figure.vertexCount * channels);
  const point = new Vector3();
  for (let v = 0; v < figure.vertexCount; v++) {
    point.fromArray(figure.restPositions, v * AXES);
    write(point, distances, extents, v * channels);
  }
  return { distances, extents };
}
