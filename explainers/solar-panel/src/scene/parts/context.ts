import { InstancedMesh, Mesh } from 'three';
import type { BufferGeometry, Material } from 'three';
import type {
  MaterialFinish,
  MaterialLibrary,
  STRUCTURE_GROUP,
  UNDIMMED_GROUP,
} from '@core/scene/materials';
import type { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { PartId } from '../../ids';
import { FINISHES } from '../finishes';
import type { Finish } from '../finishes';

export type EmphasisGroup = PartId | typeof STRUCTURE_GROUP | typeof UNDIMMED_GROUP;

export interface PartContext {
  materials: MaterialLibrary;
  tracker: ResourceTracker;
  textures: SceneTextures;
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
  group: EmphasisGroup,
  finish: Finish,
): Mesh {
  return finishMesh(context, geometry, group, FINISHES[finish]);
}

export function registered<T extends Material>(
  context: PartContext,
  group: EmphasisGroup,
  material: T,
): T {
  context.materials.register(group, context.tracker.track(material));
  return material;
}

export function registeredMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  material: Material,
): Mesh {
  return new Mesh(context.tracker.track(geometry), registered(context, group, material));
}

export function instancedMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: MaterialFinish,
  count: number,
): InstancedMesh {
  const material = context.materials.get(group, finish);
  const mesh = new InstancedMesh(context.tracker.track(geometry), material, count);
  return context.tracker.track(mesh);
}
