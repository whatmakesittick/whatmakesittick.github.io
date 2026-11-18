import { Group, InstancedMesh, Mesh } from 'three';
import type { BufferGeometry, Material, MeshStandardMaterial, Object3D } from 'three';
import type { MaterialFinish, MaterialLibrary } from '@core/scene/materials';
import type { STRUCTURE_GROUP, UNDIMMED_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import type { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { AssemblyState, PartId, Point } from '../../ids';
import { FINISHES } from '../finishes';
import type { Finish } from '../finishes';

export type EmphasisGroup = PartId | typeof STRUCTURE_GROUP | typeof UNDIMMED_GROUP;

export interface PartContext {
  readonly materials: MaterialLibrary;
  readonly tracker: ResourceTracker;
  readonly textures: SceneTextures;
  readonly labels: Map<PartId, Object3D>;
}

export interface Section {
  readonly root: Object3D;
  setState(state: AssemblyState): void;
  update?(deltaSeconds: number): boolean;
  refresh?(): void;
}

export function namedGroup(name: string, parent?: Object3D): Group {
  const group = new Group();
  group.name = name;
  parent?.add(group);
  return group;
}

export function label(
  context: PartContext,
  part: PartId,
  parent: Object3D,
  point: Point,
): Object3D {
  const anchor = anchorAt(parent, ...point);
  anchor.name = `${part}Label`;
  context.labels.set(part, anchor);
  return anchor;
}

export function material(
  context: PartContext,
  group: EmphasisGroup,
  finish: Finish | MaterialFinish,
): MeshStandardMaterial {
  return context.materials.get(group, typeof finish === 'string' ? FINISHES[finish] : finish);
}

export function addMesh(
  context: PartContext,
  parent: Object3D,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: Finish | MaterialFinish,
): Mesh {
  const mesh = new Mesh(context.tracker.track(geometry), material(context, group, finish));
  mesh.name = group;
  parent.add(mesh);
  return mesh;
}

export function addShaded(
  context: PartContext,
  parent: Object3D,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  shader: Material,
): Mesh {
  const mesh = new Mesh(
    context.tracker.track(geometry),
    registeredMaterial(context, group, shader),
  );
  mesh.name = group;
  parent.add(mesh);
  return mesh;
}

export function registeredMaterial<M extends Material>(
  context: PartContext,
  group: EmphasisGroup,
  shader: M,
): M {
  context.materials.register(group, context.tracker.track(shader));
  return shader;
}

export function instanced(
  context: PartContext,
  parent: Object3D,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: Finish | MaterialFinish,
  count: number,
): InstancedMesh {
  const mesh = new InstancedMesh(geometry, material(context, group, finish), count);
  mesh.name = group;
  mesh.frustumCulled = false;
  mesh.count = 0;
  parent.add(mesh);
  return context.tracker.track(mesh);
}
