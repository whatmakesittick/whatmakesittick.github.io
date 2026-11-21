/// <reference types="node" />

import { readFileSync } from 'node:fs';

const FIXTURES = new URL('./fixtures/', import.meta.url);
const AXES = 3;
const QUATERNION = 4;

interface GroundTruthMeta {
  readonly poses: number;
  readonly vertices: number;
  readonly joints: number;
  readonly columns: readonly string[];
}

export interface GroundTruthPose {
  readonly parameters: Readonly<Record<string, number>>;
  readonly correctivesOn: Float32Array;
  readonly correctivesOff: Float32Array;
  readonly jointPositions: Float32Array;
  readonly jointRotations: Float32Array;
}

export interface GroundTruth {
  readonly vertexIds: Uint16Array;
  readonly poses: readonly GroundTruthPose[];
}

function floats(buffer: ArrayBuffer, offset: number, count: number): Float32Array {
  return new Float32Array(buffer.slice(offset, offset + count * Float32Array.BYTES_PER_ELEMENT));
}

export function loadGroundTruth(): GroundTruth {
  const meta = JSON.parse(
    readFileSync(new URL('ground-truth.json', FIXTURES), 'utf8'),
  ) as GroundTruthMeta;
  const file = readFileSync(new URL('ground-truth.bin', FIXTURES));
  const buffer = file.buffer.slice(
    file.byteOffset,
    file.byteOffset + file.byteLength,
  ) as ArrayBuffer;
  const f = Float32Array.BYTES_PER_ELEMENT;
  const idsBytes = meta.vertices * Uint16Array.BYTES_PER_ELEMENT;
  const columns = meta.columns.length;
  const vertexFloats = meta.vertices * AXES;
  let cursor = idsBytes;
  const take = (count: number): Float32Array => {
    const out = floats(buffer, cursor, count);
    cursor += count * f;
    return out;
  };
  const parameters = take(meta.poses * columns);
  const on = take(meta.poses * vertexFloats);
  const off = take(meta.poses * vertexFloats);
  const positions = take(meta.poses * meta.joints * AXES);
  const rotations = take(meta.poses * meta.joints * QUATERNION);
  const poses = Array.from({ length: meta.poses }, (_, p) => ({
    parameters: Object.fromEntries(
      meta.columns.map((name, c) => [name, parameters[p * columns + c]]),
    ),
    correctivesOn: on.subarray(p * vertexFloats, (p + 1) * vertexFloats),
    correctivesOff: off.subarray(p * vertexFloats, (p + 1) * vertexFloats),
    jointPositions: positions.subarray(p * meta.joints * AXES, (p + 1) * meta.joints * AXES),
    jointRotations: rotations.subarray(
      p * meta.joints * QUATERNION,
      (p + 1) * meta.joints * QUATERNION,
    ),
  }));
  return { vertexIds: new Uint16Array(buffer.slice(0, idsBytes)), poses };
}
