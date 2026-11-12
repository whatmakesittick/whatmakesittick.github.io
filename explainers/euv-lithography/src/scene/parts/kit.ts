import {
  AdditiveBlending,
  CurvePath,
  CylinderGeometry,
  InstancedMesh,
  LineCurve3,
  Matrix4,
  QuadraticBezierCurve3,
  Quaternion,
  Sprite,
  SpriteMaterial,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { BufferGeometry, Material, Mesh, Object3D } from 'three';
import { latheAlongX } from '@core/scene/geometry/lathe';
import type { Point } from '../../ids';
import { FINISHES } from '../finishes';
import type { Finish } from '../finishes';
import { registeredMaterial } from './context';
import type { EmphasisGroup, PartContext } from './context';

const EASE_SECONDS = 0.6;
const SETTLE_TIME_CONSTANTS = 5;
const TIME_CONSTANT = EASE_SECONDS / SETTLE_TIME_CONSTANTS;
const UP = new Vector3(0, 1, 0);
const BOLT_SIDES = 6;
const RING_SEGMENTS = 40;
const TUBE_RADIAL = 10;
const TUBE_SAMPLES_PER_METRE = 6;
const MIN_TUBE_SAMPLES = 4;

export class Ease {
  private target: number;
  private current: number;
  private remaining = 0;

  constructor(value: number) {
    this.target = value;
    this.current = value;
  }

  get value(): number {
    return this.current;
  }

  get running(): boolean {
    return this.remaining > 0;
  }

  aim(target: number): void {
    if (target === this.target) return;
    this.target = target;
    this.remaining = EASE_SECONDS;
  }

  step(deltaSeconds: number): void {
    if (!this.running) return;
    this.remaining = Math.max(0, this.remaining - deltaSeconds);
    const share = 1 - Math.exp(-deltaSeconds / TIME_CONSTANT);
    this.current = this.running ? this.current + (this.target - this.current) * share : this.target;
  }
}

export class Cutaway {
  private readonly entries: [Mesh, Material, Material][] = [];

  add(target: Mesh, ghost: Material): Mesh {
    this.entries.push([target, target.material as Material, ghost]);
    return target;
  }

  set(open: boolean): void {
    this.entries.forEach(([target, solid, ghost]) => (target.material = open ? ghost : solid));
  }
}

export function vector(point: Point): Vector3 {
  return new Vector3(...point);
}

export function mirrorNormal(previous: Point, here: Point, next: Point): Vector3 {
  const centre = vector(here);
  const incoming = vector(previous).sub(centre).normalize();
  const outgoing = vector(next).sub(centre).normalize();
  return incoming.add(outgoing).normalize();
}

export function facing(normal: Vector3): Quaternion {
  return new Quaternion().setFromUnitVectors(UP, normal.clone().normalize());
}

export function orient(object: Object3D, normal: Vector3): Object3D {
  object.quaternion.copy(facing(normal));
  return object;
}

export function placement(
  position: Point,
  scale: Point = [1, 1, 1],
  rotation: Quaternion = new Quaternion(),
): Matrix4 {
  return new Matrix4().compose(vector(position), rotation, vector(scale));
}

export function instanced(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: Finish,
  matrices: readonly Matrix4[],
): InstancedMesh {
  const material = context.materials.get(group, FINISHES[finish]);
  const target = context.tracker.track(
    new InstancedMesh(context.tracker.track(geometry), material, Math.max(1, matrices.length)),
  );
  target.count = matrices.length;
  matrices.forEach((matrix, index) => target.setMatrixAt(index, matrix));
  target.instanceMatrix.needsUpdate = true;
  target.computeBoundingBox();
  target.computeBoundingSphere();
  return target;
}

export function washerAlongX(inner: number, outer: number, thickness: number): BufferGeometry {
  const half = thickness / 2;
  const profile = [
    new Vector2(inner, -half),
    new Vector2(outer, -half),
    new Vector2(outer, half),
    new Vector2(inner, half),
    new Vector2(inner, -half),
  ];
  return latheAlongX(profile, RING_SEGMENTS);
}

export function boltHead(size: number): BufferGeometry {
  return new CylinderGeometry(size, size, size * 0.8, BOLT_SIDES);
}

export function boltCircleAlongX(
  centre: Point,
  radius: number,
  count: number,
  offset = 0,
): Matrix4[] {
  const toX = new Quaternion().setFromUnitVectors(UP, new Vector3(1, 0, 0));
  return Array.from({ length: count }, (_, index) => {
    const angle = offset + (index / count) * Math.PI * 2;
    const point: Point = [
      centre[0],
      centre[1] + Math.cos(angle) * radius,
      centre[2] + Math.sin(angle) * radius,
    ];
    return placement(point, [1, 1, 1], toX);
  });
}

export function bentPath(points: readonly Point[], bend: number): CurvePath<Vector3> {
  const path = new CurvePath<Vector3>();
  const corners = points.map(vector);
  let start = corners[0];
  for (let index = 1; index < corners.length - 1; index += 1) {
    const corner = corners[index];
    const before = corners[index - 1].clone().sub(corner);
    const after = corners[index + 1].clone().sub(corner);
    const radius = Math.min(bend, before.length() / 2, after.length() / 2);
    const entry = corner.clone().add(before.normalize().multiplyScalar(radius));
    const exit = corner.clone().add(after.normalize().multiplyScalar(radius));
    path.add(new LineCurve3(start, entry));
    path.add(new QuadraticBezierCurve3(entry, corner, exit));
    start = exit;
  }
  path.add(new LineCurve3(start, corners[corners.length - 1]));
  return path;
}

export function pipe(points: readonly Point[], radius: number, bend = radius * 3): BufferGeometry {
  const path = bentPath(points, bend);
  const samples = Math.max(MIN_TUBE_SAMPLES, Math.ceil(path.getLength() * TUBE_SAMPLES_PER_METRE));
  return new TubeGeometry(path, samples + path.curves.length * 4, radius, TUBE_RADIAL, false);
}

export function glowSprite(
  context: PartContext,
  group: EmphasisGroup,
  color: string,
  size: number,
): Sprite {
  const material = registeredMaterial(
    context,
    group,
    new SpriteMaterial({
      map: context.textures.glow,
      color,
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
    }),
  );
  const sprite = new Sprite(material);
  sprite.scale.setScalar(size);
  return sprite;
}
