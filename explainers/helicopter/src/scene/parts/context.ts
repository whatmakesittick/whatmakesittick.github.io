import { Mesh } from 'three';
import type { BufferGeometry } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import type { ResourceTracker } from '@core/scene/resources';
import { FINISHES } from '../finishes';
import type { Finish } from '../finishes';
import type { PartId } from '../../state';

export interface PartContext {
  materials: MaterialLibrary;
  tracker: ResourceTracker;
}

export function partMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: PartId,
  finish: Finish,
): Mesh {
  return new Mesh(context.tracker.track(geometry), context.materials.get(group, FINISHES[finish]));
}
