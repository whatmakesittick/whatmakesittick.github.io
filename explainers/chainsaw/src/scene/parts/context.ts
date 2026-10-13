import { Group, InstancedMesh, Mesh } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import type { MaterialLibrary, STRUCTURE_GROUP, UNDIMMED_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import type { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { AssemblyState, PartId, Point } from '../../ids';
import { FINISHES, PART_FINISHES } from '../finishes';
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

export function partMesh(
  context: PartContext,
  geometry: BufferGeometry,
  part: PartId,
  finish: Finish = PART_FINISHES[part],
): Mesh {
  const mesh = new Mesh(
    context.tracker.track(geometry),
    context.materials.get(part, FINISHES[finish]),
  );
  mesh.name = part;
  return mesh;
}

export function addPart(
  context: PartContext,
  parent: Object3D,
  geometry: BufferGeometry,
  part: PartId,
  finish?: Finish,
): Mesh {
  const mesh = partMesh(context, geometry, part, finish);
  parent.add(mesh);
  return mesh;
}

export function registeredMaterial<M extends Material>(
  context: PartContext,
  group: EmphasisGroup,
  material: M,
): M {
  context.materials.register(group, context.tracker.track(material));
  return material;
}

export function instancedPart(
  context: PartContext,
  geometry: BufferGeometry,
  part: PartId,
  count: number,
  finish: Finish = PART_FINISHES[part],
): InstancedMesh {
  const material = context.materials.get(part, FINISHES[finish]);
  const mesh = new InstancedMesh(context.tracker.track(geometry), material, count);
  mesh.name = part;
  mesh.frustumCulled = false;
  return context.tracker.track(mesh);
}

export function setFronts(fronts: readonly Object3D[], cutaway: boolean): void {
  fronts.forEach((front) => {
    front.visible = !cutaway;
  });
}
