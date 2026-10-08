import { CylinderGeometry, Shape, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FULL_TURN } from '@core/math';
import { box } from '@core/scene/geometry/box';
import { latheAlongX } from '@core/scene/geometry/lathe';
import type { ProfilePoint } from '@core/scene/geometry/lathe';
import { SEGMENTS } from './constants';

export type Range = readonly [min: number, max: number];

export interface BoltRing {
  count: number;
  radius: number;
  x: number;
  side: 1 | -1;
  head: number;
  length: number;
  phase?: number;
}

const QUARTER_TURN = FULL_TURN / 4;
const KEPT_ATTRIBUTES = ['position', 'normal'];
const TOOTH_CORNERS = [0, 0.18, 0.5, 0.68];

function flattened(geometry: BufferGeometry): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (flat !== geometry) geometry.dispose();
  Object.keys(flat.attributes)
    .filter((name) => !KEPT_ATTRIBUTES.includes(name))
    .forEach((name) => flat.deleteAttribute(name));
  return flat;
}

export function merge(parts: readonly BufferGeometry[]): BufferGeometry {
  const flats = parts.map(flattened);
  const merged = mergeGeometries(flats);
  flats.forEach((part) => part.dispose());
  return merged;
}

export function span(x: Range, y: Range, z: Range): BufferGeometry {
  return box({ minX: x[0], maxX: x[1], minY: y[0], maxY: y[1], minZ: z[0], maxZ: z[1] });
}

export function turned(profile: readonly ProfilePoint[], segments: number): BufferGeometry {
  const last = profile.length - 1;
  const points = profile.flatMap(([axial, radius], index) => {
    const point = new Vector2(radius, axial);
    return index > 0 && index < last ? [point, point.clone()] : [point];
  });
  return latheAlongX(points, segments);
}

export function turnedUp(profile: readonly ProfilePoint[], segments: number): BufferGeometry {
  return turned(profile, segments).rotateZ(QUARTER_TURN);
}

export function rodAlongX(x: Range, radius: number, segments: number): BufferGeometry {
  const geometry = new CylinderGeometry(radius, radius, x[1] - x[0], segments);
  geometry.rotateZ(QUARTER_TURN);
  return geometry.translate((x[0] + x[1]) / 2, 0, 0);
}

export function rodUp(y: Range, radius: number, segments: number): BufferGeometry {
  const geometry = new CylinderGeometry(radius, radius, y[1] - y[0], segments);
  return geometry.translate(0, (y[0] + y[1]) / 2, 0);
}

export function boltRing(ring: BoltRing): BufferGeometry[] {
  const { count, radius, x, side, head, length, phase = 0 } = ring;
  const ends: Range = side > 0 ? [x, x + length] : [x - length, x];
  const bolt = rodAlongX(ends, head, SEGMENTS.bolt);
  const bolts = Array.from({ length: count }, (_, index) => {
    const angle = phase + (index / count) * FULL_TURN;
    return bolt.clone().translate(0, radius * Math.sin(angle), radius * Math.cos(angle));
  });
  bolt.dispose();
  return bolts;
}

export function circlePoints(radius: number, count: number, centre = new Vector2()): Vector2[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * FULL_TURN;
    return new Vector2(centre.x + radius * Math.cos(angle), centre.y + radius * Math.sin(angle));
  });
}

export function gearShape(root: number, tip: number, teeth: number): Shape {
  const pitch = FULL_TURN / teeth;
  const corners = TOOTH_CORNERS.map((fraction) => fraction * pitch);
  const radii = [root, tip, tip, root];
  const points = Array.from({ length: teeth }, (_, tooth) =>
    corners.map((corner, index) => {
      const angle = tooth * pitch + corner;
      return new Vector2(radii[index] * Math.cos(angle), radii[index] * Math.sin(angle));
    }),
  ).flat();
  return new Shape(points);
}

export function arcPoints(radius: number, from: number, to: number, count: number): Vector2[] {
  return Array.from({ length: count + 1 }, (_, index) => {
    const angle = from + ((to - from) * index) / count;
    return new Vector2(radius * Math.cos(angle), radius * Math.sin(angle));
  });
}

export type Side = 1 | -1;
export const SIDES: readonly Side[] = [1, -1];

export function mirrored(range: Range, side: Side): Range {
  return side > 0 ? range : [-range[1], -range[0]];
}

export interface IBeam {
  width: number;
  bottom: number;
  top: number;
  web: number;
  flange: number;
}

export function iBeamShape(centre: number, beam: IBeam): Shape {
  const half = beam.width / 2;
  const web = beam.web / 2;
  const low = beam.bottom + beam.flange;
  const high = beam.top - beam.flange;
  const outline: readonly (readonly [number, number])[] = [
    [-half, beam.bottom],
    [half, beam.bottom],
    [half, low],
    [web, low],
    [web, high],
    [half, high],
    [half, beam.top],
    [-half, beam.top],
    [-half, high],
    [-web, high],
    [-web, low],
    [-half, low],
  ];
  return new Shape(outline.map(([a, b]) => new Vector2(centre + a, b)));
}
