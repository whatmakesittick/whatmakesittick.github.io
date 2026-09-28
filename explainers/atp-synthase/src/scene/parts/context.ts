import { InstancedMesh, Mesh } from 'three';
import type { BufferGeometry, Material } from 'three';
import type { MaterialFinish, MaterialLibrary, STRUCTURE_GROUP } from '@core/scene/materials';
import type { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { PartId } from '../../ids';

export type EmphasisGroup = PartId | typeof STRUCTURE_GROUP;

export interface PartContext {
  readonly materials: MaterialLibrary;
  readonly tracker: ResourceTracker;
  readonly textures: SceneTextures;
}

export function finishMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: MaterialFinish,
): Mesh {
  return new Mesh(context.tracker.track(geometry), context.materials.get(group, finish));
}

export function surfacedMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finishes: readonly MaterialFinish[],
): Mesh {
  const materials = finishes.map((finish) => context.materials.get(group, finish));
  return new Mesh(context.tracker.track(geometry), materials);
}

export function registeredMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  material: Material,
): Mesh {
  context.materials.register(group, context.tracker.track(material));
  return new Mesh(context.tracker.track(geometry), material);
}

export function instancedMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: MaterialFinish,
  count: number,
): InstancedMesh {
  const material = context.materials.get(group, finish);
  return context.tracker.track(new InstancedMesh(context.tracker.track(geometry), material, count));
}
