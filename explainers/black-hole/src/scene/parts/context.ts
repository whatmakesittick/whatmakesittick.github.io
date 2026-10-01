import { Mesh } from 'three';
import type { BufferGeometry, Material } from 'three';
import type { MaterialFinish, MaterialLibrary } from '@core/scene/materials';
import type { STRUCTURE_GROUP, UNDIMMED_GROUP } from '@core/scene/materials';
import type { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { PartId } from '../../ids';
import type { Finishes } from '../finishes';

export type EmphasisGroup = PartId | typeof STRUCTURE_GROUP | typeof UNDIMMED_GROUP;

export interface PartContext {
  materials: MaterialLibrary;
  tracker: ResourceTracker;
  textures: SceneTextures;
  finishes: Finishes;
}

export function partMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: MaterialFinish,
): Mesh {
  return new Mesh(context.tracker.track(geometry), context.materials.get(group, finish));
}

export function registered<T extends Material>(
  context: PartContext,
  group: EmphasisGroup,
  material: T,
): T {
  context.materials.register(group, context.tracker.track(material));
  return material;
}
