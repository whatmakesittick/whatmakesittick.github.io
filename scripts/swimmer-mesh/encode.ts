import type {
  EncodedBody,
  HalfRest,
} from '../../explainers/freestyle-swim/src/scene/parts/swimmer/skin/decode.ts';
import {
  INFLUENCES,
  SLOT_IDS,
  type SlotId,
} from '../../explainers/freestyle-swim/src/scene/parts/swimmer/skin/types.ts';

export const POSITION_STEP = 0.0005;
const WEIGHT_SCALE = 255;
const REST_DECIMALS = 5;
const BYTE_CHUNK = 0x8000;
const EXPLICIT_TRIANGLE = 3;

export interface HalfMesh {
  readonly positions: ArrayLike<number>;
  readonly joints: ArrayLike<number>;
  readonly weights: ArrayLike<number>;
  readonly slots: Readonly<Record<SlotId, ArrayLike<number>>>;
  readonly rest: HalfRest;
}

class ByteWriter {
  readonly bytes: number[] = [];

  varint(value: number): void {
    let rest = value;
    while (rest >= 0x80) {
      this.bytes.push((rest & 0x7f) | 0x80);
      rest = Math.floor(rest / 0x80);
    }
    this.bytes.push(rest);
  }

  signed(value: number): void {
    this.varint(value < 0 ? -2 * value - 1 : 2 * value);
  }
}

function toBase64(bytes: ArrayLike<number>): string {
  let text = '';
  for (let i = 0; i < bytes.length; i += BYTE_CHUNK) {
    text += String.fromCharCode(
      ...Array.from({ length: Math.min(BYTE_CHUNK, bytes.length - i) }, (_, k) => bytes[i + k]),
    );
  }
  return btoa(text);
}

function quantise(positions: ArrayLike<number>, vertex: number): [number, number, number] {
  const [x, y, z] = [0, 1, 2].map((k) => Math.round(positions[vertex * 3 + k] / POSITION_STEP));
  const keepOffMidline = positions[vertex * 3 + 2] > 0 && z === 0;
  return [x, y, keepOffMidline ? 1 : z];
}

function encodePositions(positions: ArrayLike<number>, count: number): string {
  const writer = new ByteWriter();
  const quantised = Array.from({ length: count }, (_, v) => quantise(positions, v));
  for (let k = 0; k < 3; k++) {
    let previous = 0;
    for (const q of quantised) {
      writer.signed(q[k] - previous);
      previous = q[k];
    }
  }
  return toBase64(writer.bytes);
}

function encodeInfluences(mesh: HalfMesh, count: number): { bones: string; weights: string } {
  const bones: number[] = [];
  const weights: number[] = [];
  for (let v = 0; v < count; v++) {
    for (let k = 0; k < INFLUENCES; k++) bones.push(mesh.joints[v * INFLUENCES + k]);
    let remaining = WEIGHT_SCALE;
    for (let k = 0; k < INFLUENCES - 1; k++) {
      const weight = Math.min(
        remaining,
        Math.round(mesh.weights[v * INFLUENCES + k] * WEIGHT_SCALE),
      );
      weights.push(weight);
      remaining -= weight;
    }
  }
  return { bones: toBase64(bones), weights: toBase64(weights) };
}

interface SharedEdge {
  readonly edge: number;
  readonly apex: number;
}

function sharedEdge(previous: number[], triangle: number[]): SharedEdge | null {
  for (let edge = 0; edge < 3; edge++) {
    const [from, to] = [previous[edge], previous[(edge + 1) % 3]];
    for (let corner = 0; corner < 3; corner++) {
      if (triangle[corner] === to && triangle[(corner + 1) % 3] === from) {
        return { edge, apex: triangle[(corner + 2) % 3] };
      }
    }
  }
  return null;
}

function encodeIndices(mesh: HalfMesh): string {
  const writer = new ByteWriter();
  let next = 0;
  const emit = (index: number): void => {
    writer.signed(next - index);
    next = Math.max(next, index + 1);
  };
  for (const slot of SLOT_IDS) {
    const indices = Array.from(mesh.slots[slot]);
    let previous: number[] = [];
    for (let i = 0; i < indices.length; i += 3) {
      const triangle = indices.slice(i, i + 3);
      const shared = sharedEdge(previous, triangle);
      if (shared) {
        writer.varint(shared.edge);
        emit(shared.apex);
        previous = [previous[(shared.edge + 1) % 3], previous[shared.edge], shared.apex];
      } else {
        writer.varint(EXPLICIT_TRIANGLE);
        triangle.forEach(emit);
        previous = triangle;
      }
    }
  }
  return toBase64(writer.bytes);
}

function roundRest(rest: HalfRest): HalfRest {
  const factor = 10 ** REST_DECIMALS;
  return JSON.parse(
    JSON.stringify(rest, (_, value) =>
      typeof value === 'number' ? Math.round(value * factor) / factor : value,
    ),
  );
}

export function encodeHalfMesh(mesh: HalfMesh): EncodedBody {
  const count = mesh.positions.length / 3;
  return {
    count,
    step: POSITION_STEP,
    positions: encodePositions(mesh.positions, count),
    ...encodeInfluences(mesh, count),
    triangles: SLOT_IDS.map((slot) => mesh.slots[slot].length / 3),
    indices: encodeIndices(mesh),
    rest: roundRest(mesh.rest),
  };
}
