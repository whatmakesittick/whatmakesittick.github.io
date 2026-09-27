import { Mesh } from 'three';
import type { BufferGeometry } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import type { STRUCTURE_GROUP } from '@core/scene/materials';
import type { ResourceTracker } from '@core/scene/resources';
import type { PartId } from '../../state';
import { FINISHES } from '../finishes';
import type { Finish } from '../finishes';
import type { Translucency } from '../translucency';

export type EmphasisGroup = PartId | typeof STRUCTURE_GROUP;

export interface PartContext {
  materials: MaterialLibrary;
  tracker: ResourceTracker;
  translucency: Translucency;
}

export function partMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: Finish,
): Mesh {
  return new Mesh(context.tracker.track(geometry), context.materials.get(group, FINISHES[finish]));
}
