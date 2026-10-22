import { Group, InstancedMesh, Mesh } from 'three';
import type { BufferGeometry, Material, Matrix4, Object3D } from 'three';
import type { MaterialFinish, MaterialLibrary, STRUCTURE_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import type { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { AnchorId, AssemblyState, NudgeId, PartId, Point } from '../../ids';
import { FINISHES, PART_FINISHES } from '../finishes';
import type { Finish } from '../finishes';

export const LINE_GROUP = 'line';

export type EmphasisGroup = PartId | typeof STRUCTURE_GROUP | typeof LINE_GROUP;

export interface PartContext {
  readonly materials: MaterialLibrary;
  readonly tracker: ResourceTracker;
  readonly textures: SceneTextures;
  readonly labels: Map<PartId, Object3D>;
  readonly anchors: Partial<Record<AnchorId, Object3D>>;
}

export interface NudgeSample {
  readonly id: NudgeId | null;
  readonly gapMm: number;
  readonly lateralMm: number;
  readonly active: boolean;
}

export interface Frame {
  readonly delta: number;
  readonly cameraDistance: number;
  readonly nudge: NudgeSample;
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

export function instancedMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: Finish,
  count: number,
): InstancedMesh {
  const material = context.materials.get(group, FINISHES[finish]);
  return context.tracker.track(new InstancedMesh(context.tracker.track(geometry), material, count));
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
  mesh.computeBoundingSphere();
  return mesh;
}
