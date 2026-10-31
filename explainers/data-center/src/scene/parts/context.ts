import { Group, InstancedMesh, Matrix4, Mesh, Quaternion, Vector3 } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import type { MaterialFinish, MaterialLibrary, STRUCTURE_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import type { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { AnchorId, AssemblyState, PartId, Point } from '../../ids';
import { boxCentre } from '../../model';
import type { BoxSpec } from '../../model';
import { FINISHES, PART_FINISHES } from '../finishes';
import type { Finish } from '../finishes';
import type { OutageSample } from './outage';

export type { OutageSample } from './outage';

export const SITE_GROUP = 'site';

export type EmphasisGroup = PartId | typeof STRUCTURE_GROUP | typeof SITE_GROUP;

const UP = new Vector3(0, 1, 0);

export interface PartContext {
  readonly materials: MaterialLibrary;
  readonly tracker: ResourceTracker;
  readonly textures: SceneTextures;
  readonly labels: Map<PartId, Object3D>;
  readonly anchors: Partial<Record<AnchorId, Object3D>>;
}

export interface Frame {
  readonly delta: number;
  readonly cameraDistance: number;
  readonly outage: OutageSample;
}

export interface Section {
  readonly root: Object3D;
  setState(state: AssemblyState): void;
  animate?(frame: Frame, state: AssemblyState): boolean;
}

export function namedGroup(name: string, parent?: Object3D): Group {
  const group = new Group();
  group.name = name;
  parent?.add(group);
  return group;
}

export function label(context: PartContext, part: PartId, parent: Object3D, point: Point): void {
  context.labels.set(part, anchorAt(parent, ...point));
}

export function sceneAnchor(
  context: PartContext,
  id: AnchorId,
  parent: Object3D,
  point: Point,
): Object3D {
  const anchor = anchorAt(parent, ...point);
  context.anchors[id] = anchor;
  return anchor;
}

export function finishMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: MaterialFinish,
): Mesh {
  return new Mesh(context.tracker.track(geometry), context.materials.get(group, finish));
}

export function partMesh(
  context: PartContext,
  geometry: BufferGeometry,
  part: PartId,
  finish: Finish = PART_FINISHES[part],
): Mesh {
  const mesh = finishMesh(context, geometry, part, FINISHES[finish]);
  mesh.name = part;
  return mesh;
}

export function groupMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: Finish,
): Mesh {
  return finishMesh(context, geometry, group, FINISHES[finish]);
}

export function registeredMaterial<M extends Material>(
  context: PartContext,
  group: EmphasisGroup,
  material: M,
): M {
  context.materials.register(group, context.tracker.track(material));
  return material;
}

export function registeredMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  material: Material,
): Mesh {
  return new Mesh(context.tracker.track(geometry), registeredMaterial(context, group, material));
}

export function boundInstances(mesh: InstancedMesh): InstancedMesh {
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  return mesh;
}

export function instancesOf(
  context: PartContext,
  geometry: BufferGeometry,
  material: Material,
  matrices: readonly Matrix4[],
): InstancedMesh {
  const mesh = context.tracker.track(
    new InstancedMesh(context.tracker.track(geometry), material, Math.max(1, matrices.length)),
  );
  mesh.count = matrices.length;
  matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
  return boundInstances(mesh);
}

export function instancedMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: Finish,
  matrices: readonly Matrix4[],
): InstancedMesh {
  const material = context.materials.get(group, FINISHES[finish]);
  return instancesOf(context, geometry, material, matrices);
}

export function placement(position: Point, scale: Point = [1, 1, 1], yaw = 0): Matrix4 {
  return new Matrix4().compose(
    new Vector3(...position),
    new Quaternion().setFromAxisAngle(UP, yaw),
    new Vector3(...scale),
  );
}

export function boxMatrix(box: BoxSpec, yaw = 0): Matrix4 {
  return placement(boxCentre(box), box.size, yaw);
}
