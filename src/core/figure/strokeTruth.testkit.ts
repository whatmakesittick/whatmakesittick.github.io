/// <reference types="node" />

import { readFileSync } from 'node:fs';

const AXES = 3;

interface StrokeTruthMeta {
  readonly poses: number;
  readonly vertices: number;
  readonly parameterNames: readonly string[];
  readonly deltaStep: number;
}

export interface StrokeTruthPose {
  readonly parameters: Readonly<Record<string, number>>;
  readonly correctivesOn: Float32Array;
  readonly correctivesOff: Float32Array;
}

export interface StrokeTruth {
  readonly vertexIds: Uint16Array;
  readonly poses: readonly StrokeTruthPose[];
}

function slice(file: Buffer, offset: number, bytes: number): ArrayBuffer {
  const start = file.byteOffset + offset;
  return file.buffer.slice(start, start + bytes) as ArrayBuffer;
}

export function loadStrokeTruth(fixtures: URL): StrokeTruth {
  const meta = JSON.parse(
    readFileSync(new URL('stroke-truth.json', fixtures), 'utf8'),
  ) as StrokeTruthMeta;
  const file = readFileSync(new URL('stroke-truth.bin', fixtures));
  const parameterCount = meta.parameterNames.length;
  const vertexFloats = meta.vertices * AXES;
  let cursor = 0;
  const take = (bytes: number): ArrayBuffer => {
    const out = slice(file, cursor, bytes);
    cursor += bytes;
    return out;
  };
  const ids = new Uint16Array(take(meta.vertices * Uint16Array.BYTES_PER_ELEMENT));
  const parameters = new Float32Array(
    take(meta.poses * parameterCount * Float32Array.BYTES_PER_ELEMENT),
  );
  const on = new Float32Array(take(meta.poses * vertexFloats * Float32Array.BYTES_PER_ELEMENT));
  const delta = new Int16Array(take(meta.poses * vertexFloats * Int16Array.BYTES_PER_ELEMENT));
  const poses = Array.from({ length: meta.poses }, (_, p) => {
    const correctivesOn = on.slice(p * vertexFloats, (p + 1) * vertexFloats);
    const correctivesOff = correctivesOn.map(
      (value, i) => value - delta[p * vertexFloats + i] * meta.deltaStep,
    );
    return {
      parameters: Object.fromEntries(
        meta.parameterNames.map((name, c) => [name, parameters[p * parameterCount + c]]),
      ),
      correctivesOn,
      correctivesOff,
    };
  });
  return { vertexIds: ids, poses };
}
