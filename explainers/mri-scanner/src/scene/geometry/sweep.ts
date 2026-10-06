import { ShapeUtils, Vector2, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { MeshBuilder } from './builder';
import type { Vertex } from './builder';
import { oriented } from './profile';
import type { Loop, Profile } from './profile';

export interface Arc {
  start: number;
  end: number;
}

export type Squash = (radius: number) => number;

export type CapSide = -1 | 1;

export interface CapOptions {
  squash?: Squash;
  lift?: number;
}

export interface SweepOptions extends CapOptions {
  arc: Arc;
  segmentsPerTurn: number;
  smoothAngle?: number;
  capped?: boolean;
}

export const FULL_TURN = 2 * Math.PI;
const FULL_ARC_EPSILON = 1e-6;
const DEFAULT_SMOOTH_ANGLE = Math.PI / 4;
const UNSQUASHED: Squash = () => 1;

export function isFullArc(arc: Arc): boolean {
  return arc.end - arc.start >= FULL_TURN - FULL_ARC_EPSILON;
}

export function arcAngles(arc: Arc, segmentsPerTurn: number): number[] {
  const span = arc.end - arc.start;
  const steps = Math.max(1, Math.ceil((span / FULL_TURN) * segmentsPerTurn));
  return Array.from({ length: steps + 1 }, (_, index) => arc.start + (span * index) / steps);
}

export function ringPoint(radius: number, z: number, angle: number, squash: Squash): Vector3 {
  return new Vector3(radius * Math.cos(angle) * squash(radius), radius * Math.sin(angle), z);
}

function ringNormal(normal: Vector2, angle: number, scale: number): Vector3 {
  return new Vector3(
    (normal.x * Math.cos(angle)) / scale,
    normal.x * Math.sin(angle),
    normal.y,
  ).normalize();
}

function segmentNormal(from: Vector2, to: Vector2): Vector2 {
  return new Vector2(to.y - from.y, from.x - to.x).normalize();
}

function endNormals(loop: Loop, index: number, smoothAngle: number): [Vector2, Vector2] {
  const count = loop.length;
  const at = (offset: number): Vector2 => loop[(index + offset + count) % count];
  const own = segmentNormal(at(0), at(1));
  const blend = (other: Vector2): Vector2 =>
    own.angleTo(other) < smoothAngle ? own.clone().add(other).normalize() : own;
  return [blend(segmentNormal(at(-1), at(0))), blend(segmentNormal(at(1), at(2)))];
}

function sweepLoop(builder: MeshBuilder, loop: Loop, angles: number[], options: SweepOptions) {
  const squash = options.squash ?? UNSQUASHED;
  const smooth = options.smoothAngle ?? DEFAULT_SMOOTH_ANGLE;
  let travelled = 0;
  loop.forEach((from, index) => {
    const to = loop[(index + 1) % loop.length];
    const [fromNormal, toNormal] = endNormals(loop, index, smooth);
    const length = from.distanceTo(to);
    const vertex = (point: Vector2, normal: Vector2, angle: number, v: number): Vertex => ({
      position: ringPoint(point.x, point.y, angle, squash),
      normal: ringNormal(normal, angle, squash(point.x)),
      uv: new Vector2(angle / FULL_TURN, v),
    });
    for (let step = 0; step < angles.length - 1; step += 1) {
      const [a, b] = [angles[step], angles[step + 1]];
      builder.quad(
        vertex(from, fromNormal, a, travelled),
        vertex(from, fromNormal, b, travelled),
        vertex(to, toNormal, a, travelled + length),
        vertex(to, toNormal, b, travelled + length),
      );
    }
    travelled += length;
  });
}

const DUPLICATE_DISTANCE = 1e-7;

function distinctPoints(loop: Loop): Vector2[] {
  return loop.filter(
    (point, index) => point.distanceTo(loop[(index + 1) % loop.length]) > DUPLICATE_DISTANCE,
  );
}

function capAt(
  builder: MeshBuilder,
  profile: Profile,
  angle: number,
  side: CapSide,
  options: CapOptions,
) {
  const squash = options.squash ?? UNSQUASHED;
  const lift = options.lift ?? 0;
  const contour = distinctPoints(profile.outer);
  const holes = profile.holes.map(distinctPoints);
  const faces = ShapeUtils.triangulateShape(contour, holes);
  const points = [contour, ...holes].flat();
  const normal = new Vector3(-Math.sin(angle), Math.cos(angle), 0).multiplyScalar(side);
  const vertex = (point: Vector2): Vertex => ({
    position: ringPoint(point.x, point.y, angle, squash).addScaledVector(normal, lift),
    normal,
    uv: point.clone(),
  });
  faces.forEach(([a, b, c]) =>
    builder.triangle(vertex(points[a]), vertex(points[b]), vertex(points[c])),
  );
}

function solidLoops(profile: Profile): Profile {
  return {
    outer: oriented(profile.outer, true),
    holes: profile.holes.map((hole) => oriented(hole, false)),
  };
}

function addCaps(builder: MeshBuilder, solid: Profile, options: SweepOptions) {
  if (isFullArc(options.arc)) return;
  capAt(builder, solid, options.arc.start, -1, options);
  capAt(builder, solid, options.arc.end, 1, options);
}

export function sweepProfile(profile: Profile, options: SweepOptions): BufferGeometry {
  const builder = new MeshBuilder();
  const angles = arcAngles(options.arc, options.segmentsPerTurn);
  const solid = solidLoops(profile);
  [solid.outer, ...solid.holes].forEach((loop) => sweepLoop(builder, loop, angles, options));
  if (options.capped ?? true) addCaps(builder, solid, options);
  return builder.toGeometry();
}

export function sweepCaps(profile: Profile, options: SweepOptions): BufferGeometry {
  const builder = new MeshBuilder();
  addCaps(builder, solidLoops(profile), options);
  return builder.toGeometry();
}

export function sectionCap(
  profile: Profile,
  angle: number,
  side: CapSide,
  options: CapOptions = {},
): BufferGeometry {
  const builder = new MeshBuilder();
  capAt(builder, solidLoops(profile), angle, side, options);
  return builder.toGeometry();
}
