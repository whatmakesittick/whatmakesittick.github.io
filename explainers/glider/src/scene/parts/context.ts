import { Mesh, Object3D } from 'three';
import type { BufferGeometry } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import type { STRUCTURE_GROUP } from '@core/scene/materials';
import type { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { PartId } from '../../state';
import { FINISHES } from '../finishes';
import type { Finish } from '../finishes';

export type EmphasisGroup = PartId | typeof STRUCTURE_GROUP;

export interface PartContext {
  materials: MaterialLibrary;
  tracker: ResourceTracker;
  textures: SceneTextures;
}

export function partMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: Finish,
): Mesh {
  return new Mesh(context.tracker.track(geometry), context.materials.get(group, FINISHES[finish]));
}

export function anchorAt(parent: Object3D, x: number, y: number, z: number): Object3D {
  const anchor = new Object3D();
  anchor.position.set(x, y, z);
  parent.add(anchor);
  return anchor;
}
