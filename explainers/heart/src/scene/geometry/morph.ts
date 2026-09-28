import { BufferAttribute, BufferGeometry } from 'three';
import type { Offset, OffsetField } from './contraction';

const XYZ = 3;

export type FieldPicker = (vertex: number) => OffsetField;

function offsets(positions: ArrayLike<number>, pick: FieldPicker): Float32Array {
  const deltas = new Float32Array(positions.length);
  const out: Offset = [0, 0, 0];
  for (let offset = 0; offset < positions.length; offset += XYZ) {
    pick(offset / XYZ)(positions[offset], positions[offset + 1], positions[offset + 2], out);
    deltas[offset] = out[0];
    deltas[offset + 1] = out[1];
    deltas[offset + 2] = out[2];
  }
  return deltas;
}

function deformedNormals(geometry: BufferGeometry, deltas: Float32Array): Float32Array {
  const positions = geometry.getAttribute('position').array;
  const moved = new Float32Array(positions.length);
  for (let offset = 0; offset < positions.length; offset += 1) {
    moved[offset] = positions[offset] + deltas[offset];
  }
  const probe = new BufferGeometry();
  probe.setAttribute('position', new BufferAttribute(moved, XYZ));
  probe.setIndex(geometry.getIndex());
  probe.computeVertexNormals();
  const normals = probe.getAttribute('normal').array as Float32Array;
  probe.dispose();
  return normals;
}

export interface MorphOptions {
  readonly flatNormals?: boolean;
}

export function addPickedMorphTargets(
  geometry: BufferGeometry,
  pickers: readonly FieldPicker[],
  options: MorphOptions = {},
): void {
  if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
  const positions = geometry.getAttribute('position').array;
  const baseNormals = geometry.getAttribute('normal').array;
  const positionTargets: BufferAttribute[] = [];
  const normalTargets: BufferAttribute[] = [];
  for (const pick of pickers) {
    const deltas = offsets(positions, pick);
    positionTargets.push(new BufferAttribute(deltas, XYZ));
    const normalDeltas = new Float32Array(positions.length);
    if (!options.flatNormals) {
      const normals = deformedNormals(geometry, deltas);
      for (let offset = 0; offset < normals.length; offset += 1) {
        normalDeltas[offset] = normals[offset] - baseNormals[offset];
      }
    }
    normalTargets.push(new BufferAttribute(normalDeltas, XYZ));
  }
  geometry.morphAttributes.position = positionTargets;
  geometry.morphAttributes.normal = normalTargets;
  geometry.morphTargetsRelative = true;
}

export function addMorphTargets(
  geometry: BufferGeometry,
  fields: readonly OffsetField[],
  options: MorphOptions = {},
): void {
  addPickedMorphTargets(
    geometry,
    fields.map((field) => () => field),
    options,
  );
}
