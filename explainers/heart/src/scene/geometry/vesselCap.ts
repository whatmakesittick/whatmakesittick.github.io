import { BufferAttribute, Color } from 'three';
import type { BufferGeometry } from 'three';
import { capGeometry, triangleCount } from './cap';
import { contourLoops, nestLoops } from './contour';
import type { ContourGrid } from './contour';
import type { Field } from './field';
import { union } from './field';
import { subsetGeometry } from './planeCut';

export interface SectionTube {
  readonly outer: Field;
  readonly inner: Field;
  readonly owner: number;
}

export type Clip = (x: number, y: number) => number;

export interface VesselCapStyle {
  readonly depthMm: number;
  readonly grid: ContourGrid;
}

const XYZ = 3;
const CORNERS = 3;
const NO_BAND = { bandMm: 0, bandShare: 0 } as const;

export function vesselSection(
  tubes: readonly SectionTube[],
  extras: readonly Field[],
  clips: readonly Clip[],
): Clip {
  const outer = union([...tubes.map((tube) => tube.outer), ...extras]);
  const inner = union(tubes.map((tube) => tube.inner));
  return (x, y) => {
    let value = Math.max(outer.distance(x, y, 0), -inner.distance(x, y, 0));
    for (const clip of clips) value = Math.max(value, clip(x, y));
    return value;
  };
}

export function ownerAt(tubes: readonly SectionTube[], x: number, y: number): number {
  let best = tubes[0].owner;
  let nearest = Number.POSITIVE_INFINITY;
  for (const tube of tubes) {
    const distance = tube.outer.distance(x, y, 0);
    if (distance < nearest) {
      nearest = distance;
      best = tube.owner;
    }
  }
  return best;
}

export function vesselCaps(
  section: Clip,
  tubes: readonly SectionTube[],
  colours: ReadonlyMap<number, string>,
  style: VesselCapStyle,
): Map<number, BufferGeometry> {
  const { outers, holes } = nestLoops(contourLoops(section, style.grid));
  const caps = new Map<number, BufferGeometry>();
  if (outers.length === 0) return caps;
  const { geometry } = capGeometry(outers, holes, NO_BAND);
  const positions = geometry.getAttribute('position').array as Float32Array;
  for (let offset = 2; offset < positions.length; offset += XYZ) positions[offset] = style.depthMm;
  const index = geometry.getIndex()?.array ?? [];
  const owners: number[] = [];
  for (let t = 0; t < index.length; t += CORNERS) {
    let x = 0;
    let y = 0;
    for (let corner = 0; corner < CORNERS; corner += 1) {
      x += positions[index[t + corner] * XYZ] / CORNERS;
      y += positions[index[t + corner] * XYZ + 1] / CORNERS;
    }
    owners.push(ownerAt(tubes, x, y));
  }
  for (const [owner, colour] of colours) {
    const piece = subsetGeometry(geometry, (_, triangle) => owners[triangle] === owner);
    if (triangleCount(piece) === 0) continue;
    const tint = new Color(colour);
    const count = piece.getAttribute('position').count;
    const tints = new Float32Array(count * XYZ);
    for (let vertex = 0; vertex < count; vertex += 1) tint.toArray(tints, vertex * XYZ);
    piece.setAttribute('color', new BufferAttribute(tints, XYZ));
    caps.set(owner, piece);
  }
  geometry.dispose();
  return caps;
}
