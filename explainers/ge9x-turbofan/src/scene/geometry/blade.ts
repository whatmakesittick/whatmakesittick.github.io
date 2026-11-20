import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import { lerp } from '@core/math';

export type SpanCurve = (share: number) => number;

export interface BladeSpec {
  readonly hub: number;
  readonly tip: number;
  readonly stations: number;
  readonly samples: number;
  readonly chord: SpanCurve;
  readonly stagger: SpanCurve;
  readonly camber: SpanCurve;
  readonly thickness: SpanCurve;
  readonly sweep?: SpanCurve;
  readonly lean?: SpanCurve;
}

export interface ChordRange {
  readonly from: number;
  readonly to: number;
  readonly inflate: number;
  readonly lift: number;
}

const FULL_CHORD: ChordRange = { from: 0, to: 1, inflate: 1, lift: 0 };
const STACK_AT = 0.5;
const NACA = [0.2969, -0.126, -0.3516, 0.2843, -0.1036] as const;
const NACA_SPREAD = 5;
const XYZ = 3;

function halfThickness(u: number, ratio: number): number {
  const [root, linear, square, cube, quartic] = NACA;
  return (
    NACA_SPREAD *
    ratio *
    (root * Math.sqrt(u) + linear * u + square * u ** 2 + cube * u ** 3 + quartic * u ** 4)
  );
}

function chordShares(samples: number, range: ChordRange): number[] {
  return Array.from({ length: samples + 1 }, (_, index) => {
    const eased = (1 - Math.cos((Math.PI * index) / samples)) / 2;
    return lerp(range.from, range.to, eased);
  });
}

interface SectionPoint {
  u: number;
  side: number;
}

function sectionLoop(samples: number, range: ChordRange): SectionPoint[] {
  const shares = chordShares(samples, range);
  const upper = shares.map((u) => ({ u, side: 1 }));
  const lower = shares
    .slice(1, -1)
    .reverse()
    .map((u) => ({ u, side: -1 }));
  return [...upper, ...lower];
}

function sectionPosition(
  spec: BladeSpec,
  share: number,
  point: SectionPoint,
  range: ChordRange,
  target: Vector3,
): Vector3 {
  const radius = lerp(spec.hub, spec.tip, share);
  const chord = spec.chord(share);
  const stagger = spec.stagger(share);
  const camber = spec.camber(share) * 4 * point.u * (1 - point.u);
  const half = halfThickness(point.u, spec.thickness(share)) * range.inflate + range.lift;
  const along = (point.u - STACK_AT) * chord;
  const across = (camber - point.side * half) * chord;
  const cos = Math.cos(stagger);
  const sin = Math.sin(stagger);
  const axial = (spec.sweep?.(share) ?? 0) + along * cos - across * sin;
  const arc = (spec.lean?.(share) ?? 0) - along * sin - across * cos;
  const angle = arc / radius;
  return target.set(axial, radius * Math.cos(angle), radius * Math.sin(angle));
}

function signedVolume(positions: readonly number[], indices: readonly number[]): number {
  let volume = 0;
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  for (let index = 0; index < indices.length; index += 3) {
    a.fromArray(positions, indices[index] * XYZ);
    b.fromArray(positions, indices[index + 1] * XYZ);
    c.fromArray(positions, indices[index + 2] * XYZ);
    volume += a.dot(b.cross(c));
  }
  return volume;
}

function flipped(indices: number[]): number[] {
  const result: number[] = [];
  for (let index = 0; index < indices.length; index += 3) {
    result.push(indices[index], indices[index + 2], indices[index + 1]);
  }
  return result;
}

function capIndices(base: number, count: number, reverse: boolean): number[] {
  const indices: number[] = [];
  for (let index = 1; index < count - 1; index += 1) {
    if (reverse) indices.push(base, base + index + 1, base + index);
    else indices.push(base, base + index, base + index + 1);
  }
  return indices;
}

export function bladeGeometry(spec: BladeSpec, range: ChordRange = FULL_CHORD): BufferGeometry {
  const loop = sectionLoop(spec.samples, range);
  const ring = loop.length;
  const positions: number[] = [];
  const point = new Vector3();
  for (let station = 0; station < spec.stations; station += 1) {
    const share = station / (spec.stations - 1);
    loop.forEach((entry) => {
      sectionPosition(spec, share, entry, range, point);
      positions.push(point.x, point.y, point.z);
    });
  }
  const indices: number[] = [];
  for (let station = 0; station < spec.stations - 1; station += 1) {
    for (let index = 0; index < ring; index += 1) {
      const a = station * ring + index;
      const b = station * ring + ((index + 1) % ring);
      indices.push(a, b, a + ring, b, b + ring, a + ring);
    }
  }
  const capBase = positions.length / XYZ;
  positions.push(...positions.slice(0, ring * XYZ));
  const tipStart = (spec.stations - 1) * ring * XYZ;
  positions.push(...positions.slice(tipStart, tipStart + ring * XYZ));
  indices.push(...capIndices(capBase, ring, true), ...capIndices(capBase + ring, ring, false));
  const oriented = signedVolume(positions, indices) < 0 ? flipped(indices) : indices;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, XYZ));
  geometry.setIndex(oriented);
  geometry.computeVertexNormals();
  return geometry;
}

export function mirroredZ(geometry: BufferGeometry): BufferGeometry {
  geometry.scale(1, 1, -1);
  const index = geometry.getIndex();
  if (index) geometry.setIndex(flipped(Array.from(index.array)));
  geometry.computeVertexNormals();
  return geometry;
}
