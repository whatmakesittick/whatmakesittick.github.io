import type { BufferGeometry } from 'three';
import { classifyCell } from './regions';
import type { BodyRegion, BodySide } from './regions';
import { SEGMENT_CELLS, SEGMENTS, SMOOTH_FROM, StationSection } from './section';
import type { SegmentId } from './section';
import { add, cross, dot, MeshBuilder, normalize, sub } from './mesh';
import type { Vec3 } from './mesh';

interface Patch {
  segment: SegmentId;
  rows: number;
  points: Vec3[][];
  normals: Vec3[][];
}

interface SideFrame {
  side: BodySide;
  mirror: number;
}

const SIDES: readonly SideFrame[] = [
  { side: 'right', mirror: 1 },
  { side: 'left', mirror: -1 },
];

const AREA_EPSILON = 1e-12;
const WELD_EPSILON = 1e-12;
const MAX_ROWS = 16;
const CAP_KEY_OFFSET = 1e7;

function samplePatch(sections: readonly StationSection[], segment: SegmentId): Patch {
  const cells = SEGMENT_CELLS[segment];
  const points = sections.map((section) =>
    Array.from({ length: cells + 1 }, (_, row): Vec3 => {
      const [z, y] = section.point(segment, row / cells);
      return [section.x, y, z];
    }),
  );
  return { segment, rows: cells + 1, points, normals: [] };
}

function accumulateNormals(patch: Patch): void {
  const { points, rows } = patch;
  const sums = points.map((column) => column.map((): Vec3 => [0, 0, 0]));
  const addTo = (corners: readonly (readonly [number, number])[], normal: Vec3) =>
    corners.forEach(([i, j]) => (sums[i][j] = add(sums[i][j], normal)));
  for (let i = 0; i < points.length - 1; i += 1) {
    for (let j = 0; j < rows - 1; j += 1) {
      const [a, b, c, d] = [points[i][j], points[i + 1][j], points[i + 1][j + 1], points[i][j + 1]];
      const lower = [
        [i, j],
        [i + 1, j],
        [i + 1, j + 1],
      ] as const;
      const upper = [
        [i, j],
        [i + 1, j + 1],
        [i, j + 1],
      ] as const;
      addTo(lower, cross(sub(b, a), sub(c, a)));
      addTo(upper, cross(sub(c, a), sub(d, a)));
    }
  }
  patch.normals = sums;
}

function coincide(a: Vec3, b: Vec3): boolean {
  const gap = sub(a, b);
  return dot(gap, gap) < WELD_EPSILON;
}

function weldColumn(patches: readonly Patch[], station: number): void {
  const nodes = patches
    .slice(SMOOTH_FROM)
    .flatMap((patch) => patch.points[station].map((_, row) => ({ patch, row })));
  let start = 0;
  for (let index = 1; index <= nodes.length; index += 1) {
    const previous = nodes[index - 1];
    const node = nodes[index];
    const joined =
      node &&
      coincide(node.patch.points[station][node.row], previous.patch.points[station][previous.row]);
    if (joined) continue;
    const group = nodes.slice(start, index);
    if (group.length > 1) {
      const total = group.reduce<Vec3>(
        (sum, { patch, row }) => add(sum, patch.normals[station][row]),
        [0, 0, 0],
      );
      group.forEach(({ patch, row }) => (patch.normals[station][row] = total));
    }
    start = index;
  }
}

function weldJunctions(patches: readonly Patch[]): void {
  patches[0].points.forEach((_, station) => weldColumn(patches, station));
  patches.forEach((patch) => {
    patch.normals = patch.normals.map((column) => column.map((sum) => normalize(sum)));
  });
}

function settleCentreline(patches: readonly Patch[]): void {
  const [floor, crown] = [patches[0], patches[patches.length - 1]];
  floor.normals.forEach((column) => (column[0] = normalize([column[0][0], column[0][1], 0])));
  crown.normals.forEach((column) => {
    const top = column[crown.rows - 1];
    column[crown.rows - 1] = normalize([top[0], top[1], 0]);
  });
}

function settleEnds(patches: readonly Patch[]): void {
  patches.forEach(({ normals }) => {
    normals[0] = normals[0].map((): Vec3 => [-1, 0, 0]);
    normals[normals.length - 1] = normals[normals.length - 1].map((): Vec3 => [1, 0, 0]);
  });
}

function mirrored(point: Vec3, mirror: number): Vec3 {
  return [point[0], point[1], point[2] * mirror];
}

function cellArea(a: Vec3, b: Vec3, c: Vec3, d: Vec3): number {
  const first = cross(sub(b, a), sub(c, a));
  const second = cross(sub(c, a), sub(d, a));
  return Math.max(dot(first, first), dot(second, second));
}

class RegionSet {
  private readonly builders = new Map<BodyRegion, MeshBuilder>();

  of(region: BodyRegion): MeshBuilder {
    let builder = this.builders.get(region);
    if (!builder) {
      builder = new MeshBuilder();
      this.builders.set(region, builder);
    }
    return builder;
  }

  build(): Map<BodyRegion, BufferGeometry> {
    return new Map([...this.builders].map(([region, builder]) => [region, builder.build()]));
  }
}

function emitPatch(regions: RegionSet, patch: Patch, k: number, frame: SideFrame): void {
  const { points, normals, rows, segment } = patch;
  const sideIndex = frame.mirror > 0 ? 0 : 1;
  const key = (i: number, j: number) =>
    ((sideIndex * SEGMENTS.length + k) * points.length + i) * MAX_ROWS + j;
  for (let i = 0; i < points.length - 1; i += 1) {
    for (let j = 0; j < rows - 1; j += 1) {
      const corners = [
        [i, j],
        [i + 1, j],
        [i + 1, j + 1],
        [i, j + 1],
      ] as const;
      const [a, b, c, d] = corners.map(([ci, cj]) => points[ci][cj]);
      if (cellArea(a, b, c, d) < AREA_EPSILON) continue;
      const x = (points[i][j][0] + points[i + 1][j][0]) / 2;
      const builder = regions.of(classifyCell({ segment, row: j, x, side: frame.side }));
      const [ia, ib, ic, id] = corners.map(([ci, cj]) =>
        builder.vertex(
          mirrored(points[ci][cj], frame.mirror),
          mirrored(normals[ci][cj], frame.mirror),
          key(ci, cj),
        ),
      );
      if (frame.mirror > 0) builder.quad(ia, ib, ic, id);
      else builder.quad(ia, id, ic, ib);
    }
  }
}

function emitCap(regions: RegionSet, patches: readonly Patch[], end: 'tail' | 'nose'): void {
  const outward: Vec3 = end === 'nose' ? [1, 0, 0] : [-1, 0, 0];
  patches.forEach((patch, k) => {
    const column = end === 'nose' ? patch.points[patch.points.length - 1] : patch.points[0];
    for (let j = 0; j < patch.rows - 1; j += 1) {
      const [low, high] = [column[j], column[j + 1]];
      const quad = [low, high, mirrored(high, -1), mirrored(low, -1)];
      if (cellArea(quad[0], quad[1], quad[2], quad[3]) < AREA_EPSILON) continue;
      const region = classifyCell({ segment: patch.segment, row: j, x: low[0], side: 'right' });
      const builder = regions.of(region);
      const base = CAP_KEY_OFFSET * (end === 'nose' ? 2 : 1) + (k * MAX_ROWS + j) * 4;
      const [a, b, c, d] = quad.map((point, corner) =>
        builder.vertex(point, outward, base + corner),
      );
      const facing = dot(cross(sub(quad[1], quad[0]), sub(quad[2], quad[0])), outward);
      if (facing >= 0) builder.quad(a, b, c, d);
      else builder.quad(a, d, c, b);
    }
  });
}

export function buildShell(stations: readonly number[]): Map<BodyRegion, BufferGeometry> {
  const sections = stations.map((x) => new StationSection(x));
  const patches = SEGMENTS.map((segment) => samplePatch(sections, segment));
  patches.forEach(accumulateNormals);
  weldJunctions(patches);
  settleCentreline(patches);
  settleEnds(patches);
  const regions = new RegionSet();
  SIDES.forEach((frame) => patches.forEach((patch, k) => emitPatch(regions, patch, k, frame)));
  emitCap(regions, patches, 'tail');
  emitCap(regions, patches, 'nose');
  return regions.build();
}
