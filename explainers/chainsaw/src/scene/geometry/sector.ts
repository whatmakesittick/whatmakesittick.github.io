import type { BufferGeometry } from 'three';
import { toRadians } from '@core/math';
import { SurfaceBuilder } from './builder';
import type { Vec3 } from './builder';

export interface SectorSpec {
  inner: number;
  outer: number;
  bottom: number;
  top: number;
  fromDeg: number;
  toDeg: number;
}

const DEGREES_PER_SEGMENT = 7.5;
const FULL_DEG = 360;
const UP: Vec3 = [0, 1, 0];
const DOWN: Vec3 = [0, -1, 0];

function radial(angle: number): Vec3 {
  return [Math.cos(angle), 0, Math.sin(angle)];
}

function at(radius: number, angle: number, y: number): Vec3 {
  return [radius * Math.cos(angle), y, radius * Math.sin(angle)];
}

function inward(normal: Vec3): Vec3 {
  return [-normal[0], -normal[1], -normal[2]];
}

function wall(builder: SurfaceBuilder, spec: SectorSpec, radius: number, a0: number, a1: number) {
  const n0 = radial(a0);
  const n1 = radial(a1);
  const facing = radius === spec.outer ? [n0, n1] : [inward(n0), inward(n1)];
  builder.quad(
    [
      at(radius, a0, spec.bottom),
      at(radius, a1, spec.bottom),
      at(radius, a1, spec.top),
      at(radius, a0, spec.top),
    ],
    [facing[0], facing[1], facing[1], facing[0]],
  );
}

function rim(builder: SurfaceBuilder, spec: SectorSpec, y: number, a0: number, a1: number) {
  const normal = y === spec.top ? UP : DOWN;
  builder.flatQuad(
    [at(spec.inner, a0, y), at(spec.outer, a0, y), at(spec.outer, a1, y), at(spec.inner, a1, y)],
    normal,
  );
}

function cap(builder: SurfaceBuilder, spec: SectorSpec, angle: number, facing: number) {
  const tangent: Vec3 = [-Math.sin(angle) * facing, 0, Math.cos(angle) * facing];
  builder.flatQuad(
    [
      at(spec.inner, angle, spec.bottom),
      at(spec.outer, angle, spec.bottom),
      at(spec.outer, angle, spec.top),
      at(spec.inner, angle, spec.top),
    ],
    tangent,
  );
}

export function sector(spec: SectorSpec): BufferGeometry {
  const builder = new SurfaceBuilder();
  const span = spec.toDeg - spec.fromDeg;
  const segments = Math.max(1, Math.ceil(Math.abs(span) / DEGREES_PER_SEGMENT));
  for (let step = 0; step < segments; step += 1) {
    const a0 = toRadians(spec.fromDeg + (span * step) / segments);
    const a1 = toRadians(spec.fromDeg + (span * (step + 1)) / segments);
    wall(builder, spec, spec.outer, a0, a1);
    if (spec.inner > 0) wall(builder, spec, spec.inner, a0, a1);
    rim(builder, spec, spec.top, a0, a1);
    rim(builder, spec, spec.bottom, a0, a1);
  }
  if (Math.abs(span) < FULL_DEG) {
    cap(builder, spec, toRadians(spec.fromDeg), -1);
    cap(builder, spec, toRadians(spec.toDeg), 1);
  }
  return builder.build();
}

export function sectorAroundZ(spec: SectorSpec): BufferGeometry {
  const geometry = sector({ ...spec, fromDeg: -spec.toDeg, toDeg: -spec.fromDeg });
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

export function sectorAroundX(spec: SectorSpec): BufferGeometry {
  const geometry = sector(spec);
  geometry.rotateZ(-Math.PI / 2);
  return geometry;
}
