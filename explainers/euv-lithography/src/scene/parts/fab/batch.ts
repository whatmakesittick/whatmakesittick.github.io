import { CylinderGeometry, Matrix4, Quaternion, Vector3 } from 'three';
import type { BufferGeometry, Mesh, Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { MaterialFinish } from '@core/scene/materials';
import type { Point } from '../../../ids';
import { FINISHES } from '../../finishes';
import type { Finish } from '../../finishes';
import { finishMesh } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { Cutaway, instanced } from '../kit';
import { AXIS_X, AXIS_Y, vec } from './shapes';

export type FinishRef = Finish | MaterialFinish;

interface Bucket {
  plain: BufferGeometry[];
  ghost: BufferGeometry[];
}

const BOLT_LIFT = 0.35;
const BOLT_HEIGHT = 0.8;
const BOLT_SIDES = 5;
const NEAR_AXIS = 0.9;

function resolved(finish: FinishRef): MaterialFinish {
  return typeof finish === 'string' ? FINISHES[finish] : finish;
}

function merged(geometries: BufferGeometry[]): BufferGeometry {
  const compatible = geometries.every((geometry) => geometry.index)
    ? geometries
    : geometries.map((geometry) => (geometry.index ? geometry.toNonIndexed() : geometry));
  const result = mergeGeometries(compatible);
  geometries.forEach((geometry) => geometry.dispose());
  if (!result) {
    const names = geometries.map((geometry) => Object.keys(geometry.attributes).join('+'));
    throw new Error(`Geometries cannot be merged: ${[...new Set(names)].join(', ')}`);
  }
  return result;
}

export class Batch {
  readonly cutaway: Cutaway;
  private readonly buckets = new Map<EmphasisGroup, Map<MaterialFinish, Bucket>>();
  private readonly bolts = new Map<EmphasisGroup, Matrix4[]>();

  private readonly context: PartContext;

  constructor(context: PartContext, cutaway = new Cutaway()) {
    this.context = context;
    this.cutaway = cutaway;
  }

  add(group: EmphasisGroup, finish: FinishRef, geometry: BufferGeometry, ghost = false): this {
    const byFinish = this.buckets.get(group) ?? new Map<MaterialFinish, Bucket>();
    this.buckets.set(group, byFinish);
    const key = resolved(finish);
    const bucket = byFinish.get(key) ?? { plain: [], ghost: [] };
    byFinish.set(key, bucket);
    (ghost ? bucket.ghost : bucket.plain).push(geometry);
    return this;
  }

  bolt(group: EmphasisGroup, position: Point, normal: Vector3, size: number): this {
    const rotation = new Quaternion().setFromUnitVectors(AXIS_Y, normal.clone().normalize());
    const lift = normal
      .clone()
      .normalize()
      .multiplyScalar(size * BOLT_LIFT);
    const at = vec(position).add(lift);
    const matrix = new Matrix4().compose(at, rotation, new Vector3(size, size, size));
    const list = this.bolts.get(group) ?? [];
    this.bolts.set(group, list);
    list.push(matrix);
    return this;
  }

  boltRing(
    group: EmphasisGroup,
    centre: Point,
    normal: Vector3,
    radius: number,
    count: number,
    size: number,
    offset = 0,
  ): this {
    const helper = Math.abs(normal.y) < NEAR_AXIS ? AXIS_Y : AXIS_X;
    const u = new Vector3().crossVectors(normal, helper).normalize();
    const v = new Vector3().crossVectors(normal, u).normalize();
    for (let index = 0; index < count; index += 1) {
      const angle = offset + (index / count) * Math.PI * 2;
      const at = vec(centre)
        .add(u.clone().multiplyScalar(Math.cos(angle) * radius))
        .add(v.clone().multiplyScalar(Math.sin(angle) * radius));
      this.bolt(group, [at.x, at.y, at.z], normal, size);
    }
    return this;
  }

  flush(parent: Object3D): Mesh[] {
    const meshes: Mesh[] = [];
    this.buckets.forEach((byFinish, group) => {
      byFinish.forEach((bucket, finish) => {
        if (bucket.plain.length > 0) {
          meshes.push(finishMesh(this.context, merged(bucket.plain), group, finish));
        }
        if (bucket.ghost.length > 0) {
          const ghosted = finishMesh(this.context, merged(bucket.ghost), group, finish);
          const veil = this.context.materials.get(group, FINISHES.ghost);
          meshes.push(this.cutaway.add(ghosted, veil));
        }
      });
    });
    this.bolts.forEach((matrices, group) => {
      meshes.push(
        instanced(
          this.context,
          new CylinderGeometry(1, 1, BOLT_HEIGHT, BOLT_SIDES),
          group,
          'bolt',
          matrices,
        ),
      );
    });
    meshes.forEach((mesh) => parent.add(mesh));
    this.buckets.clear();
    this.bolts.clear();
    return meshes;
  }
}
