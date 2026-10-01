import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { BufferAttribute, InterleavedBufferAttribute } from 'three';

export interface CutSplit {
  half: BufferGeometry;
  face: BufferGeometry | null;
}

type Attribute = BufferAttribute | InterleavedBufferAttribute;

interface Buffers {
  position: number[];
  normal: number[];
  uv: number[];
}

const ON_CUT = 1e-4;
const MIN_AREA = 1e-7;
const XYZ = 3;
const UV = 2;
const CUT_NORMAL = [0, 0, 1] as const;

function emptyBuffers(): Buffers {
  return { position: [], normal: [], uv: [] };
}

function flatArea(position: Attribute, first: number): number {
  const ax = position.getX(first);
  const ay = position.getY(first);
  return (
    (position.getX(first + 1) - ax) * (position.getY(first + 2) - ay) -
    (position.getY(first + 1) - ay) * (position.getX(first + 2) - ax)
  );
}

function pushUv(target: Buffers, uv: Attribute | undefined, vertex: number): void {
  if (uv) target.uv.push(uv.getX(vertex), uv.getY(vertex));
}

function pushFlattened(
  target: Buffers,
  position: Attribute,
  uv: Attribute | undefined,
  first: number,
): void {
  const area = flatArea(position, first);
  if (Math.abs(area) < MIN_AREA) return;
  const order = area > 0 ? [0, 1, 2] : [0, 2, 1];
  for (const offset of order) {
    const vertex = first + offset;
    target.position.push(position.getX(vertex), position.getY(vertex), 0);
    target.normal.push(...CUT_NORMAL);
    pushUv(target, uv, vertex);
  }
}

function pushClamped(
  target: Buffers,
  position: Attribute,
  normal: Attribute,
  uv: Attribute | undefined,
  first: number,
): void {
  for (let vertex = first; vertex < first + 3; vertex += 1) {
    target.position.push(
      position.getX(vertex),
      position.getY(vertex),
      Math.min(0, position.getZ(vertex)),
    );
    target.normal.push(normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex));
    pushUv(target, uv, vertex);
  }
}

function build(buffers: Buffers): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(buffers.position, XYZ));
  geometry.setAttribute('normal', new Float32BufferAttribute(buffers.normal, XYZ));
  if (buffers.uv.length > 0)
    geometry.setAttribute('uv', new Float32BufferAttribute(buffers.uv, UV));
  return geometry;
}

function onRemovedSide(position: Attribute, first: number): boolean {
  return [0, 1, 2].every((offset) => position.getZ(first + offset) >= -ON_CUT);
}

export function splitAtCut(geometry: BufferGeometry): CutSplit {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  if (!source.getAttribute('normal')) source.computeVertexNormals();
  const position = source.getAttribute('position');
  const normal = source.getAttribute('normal');
  const uv = source.getAttribute('uv') as Attribute | undefined;
  const half = emptyBuffers();
  const face = emptyBuffers();
  for (let first = 0; first < position.count; first += 3) {
    if (onRemovedSide(position, first)) pushFlattened(face, position, uv, first);
    else pushClamped(half, position, normal, uv, first);
  }
  if (source !== geometry) source.dispose();
  return { half: build(half), face: face.position.length > 0 ? build(face) : null };
}
