import { bodyMeshData } from './bodyMesh.data';
import {
  INFLUENCES,
  MIRRORED_SLOT,
  SLOT_IDS,
  mirrorBone,
  type RestPose,
  type RestSide,
  type SkinMesh,
  type SlotId,
  type Triple,
} from './types';

export type HalfRest = Omit<RestPose, 'left'>;

export interface EncodedBody {
  readonly count: number;
  readonly step: number;
  readonly positions: string;
  readonly bones: string;
  readonly weights: string;
  readonly triangles: readonly number[];
  readonly indices: string;
  readonly rest: HalfRest;
}

const WEIGHT_SCALE = 255;
const VARINT_BITS = 7;
const VARINT_MORE = 0x80;
const VARINT_MASK = 0x7f;
const EXPLICIT_TRIANGLE = 3;

function bytesOf(base64: string): Uint8Array {
  const text = atob(base64);
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
  return bytes;
}

function readerOf(bytes: Uint8Array): { varint: () => number; signed: () => number } {
  let cursor = 0;
  const varint = (): number => {
    let value = 0;
    let factor = 1;
    while (bytes[cursor] >= VARINT_MORE) {
      value += (bytes[cursor++] & VARINT_MASK) * factor;
      factor *= 1 << VARINT_BITS;
    }
    return value + bytes[cursor++] * factor;
  };
  const signed = (): number => {
    const value = varint();
    return value % 2 === 0 ? value / 2 : -(value + 1) / 2;
  };
  return { varint, signed };
}

function mirrorTriple([x, y, z]: Triple): Triple {
  return [x, y, -z];
}

function mirrorSide(side: RestSide): RestSide {
  return Object.fromEntries(
    Object.entries(side).map(([key, value]) => [key, mirrorTriple(value)]),
  ) as unknown as RestSide;
}

function decodePositions(data: EncodedBody): Int32Array {
  const reader = readerOf(bytesOf(data.positions));
  const quantised = new Int32Array(data.count * 3);
  for (let k = 0; k < 3; k++) {
    let value = 0;
    for (let v = 0; v < data.count; v++) quantised[v * 3 + k] = value += reader.signed();
  }
  return quantised;
}

function mirrorIndices(quantised: Int32Array, count: number): Int32Array {
  const mirror = new Int32Array(count);
  let total = count;
  for (let v = 0; v < count; v++) mirror[v] = quantised[v * 3 + 2] === 0 ? v : total++;
  return mirror;
}

function decodeIndices(data: EncodedBody): Record<SlotId, number[]> {
  const bytes = bytesOf(data.indices);
  const next = readerOf(bytes);
  const slots = {} as Record<SlotId, number[]>;
  let highest = 0;
  const read = (): number => {
    const index = highest - next.signed();
    highest = Math.max(highest, index + 1);
    return index;
  };
  SLOT_IDS.forEach((slot, s) => {
    const indices: number[] = [];
    for (let t = 0; t < data.triangles[s]; t++) {
      const code = next.varint();
      if (code === EXPLICIT_TRIANGLE) indices.push(read(), read(), read());
      else {
        const base = indices.length - 3;
        indices.push(indices[base + ((code + 1) % 3)], indices[base + code], read());
      }
    }
    slots[slot] = indices;
  });
  return slots;
}

function fillVertices(
  data: EncodedBody,
  quantised: Int32Array,
  mirror: Int32Array,
  mesh: SkinMesh,
): void {
  const bones = bytesOf(data.bones);
  const weights = bytesOf(data.weights);
  const lastInfluence = INFLUENCES - 1;
  for (let v = 0; v < data.count; v++) {
    const twin = mirror[v];
    let remaining = WEIGHT_SCALE;
    for (let k = 0; k < INFLUENCES; k++) {
      const weight = k < lastInfluence ? weights[v * lastInfluence + k] : remaining;
      remaining -= weight;
      mesh.joints[v * INFLUENCES + k] = bones[v * INFLUENCES + k];
      mesh.weights[v * INFLUENCES + k] = weight / WEIGHT_SCALE;
      if (twin === v) continue;
      mesh.joints[twin * INFLUENCES + k] = mirrorBone(bones[v * INFLUENCES + k]);
      mesh.weights[twin * INFLUENCES + k] = weight / WEIGHT_SCALE;
    }
    for (let k = 0; k < 3; k++) {
      mesh.positions[v * 3 + k] = quantised[v * 3 + k] * data.step;
      if (twin !== v)
        mesh.positions[twin * 3 + k] = (k === 2 ? -1 : 1) * quantised[v * 3 + k] * data.step;
    }
  }
}

function mirroredSlots(
  right: Record<SlotId, number[]>,
  mirror: Int32Array,
): Record<SlotId, Uint16Array> {
  const lists = Object.fromEntries(SLOT_IDS.map((slot) => [slot, [...right[slot]]])) as Record<
    SlotId,
    number[]
  >;
  for (const slot of SLOT_IDS) {
    const target = lists[MIRRORED_SLOT[slot] ?? slot];
    const source = right[slot];
    for (let i = 0; i < source.length; i += 3)
      target.push(mirror[source[i]], mirror[source[i + 2]], mirror[source[i + 1]]);
  }
  return Object.fromEntries(
    SLOT_IDS.map((slot) => [slot, Uint16Array.from(lists[slot])]),
  ) as Record<SlotId, Uint16Array>;
}

export function decodeSkinMeshFrom(data: EncodedBody): SkinMesh {
  const quantised = decodePositions(data);
  const mirror = mirrorIndices(quantised, data.count);
  const vertexCount = mirror.reduce((highest, twin) => Math.max(highest, twin + 1), data.count);
  const mesh: SkinMesh = {
    vertexCount,
    positions: new Float32Array(vertexCount * 3),
    joints: new Uint8Array(vertexCount * INFLUENCES),
    weights: new Float32Array(vertexCount * INFLUENCES),
    slots: mirroredSlots(decodeIndices(data), mirror),
    rest: { ...data.rest, left: mirrorSide(data.rest.right) },
  };
  fillVertices(data, quantised, mirror, mesh);
  return mesh;
}

export function decodeSkinMesh(): SkinMesh {
  return decodeSkinMeshFrom(bodyMeshData);
}
