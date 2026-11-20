import type { Material } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import type { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';

export interface PartContext {
  readonly materials: MaterialLibrary;
  readonly textures: SceneTextures;
  readonly tracker: ResourceTracker;
}

export function registered<T extends Material>(
  context: PartContext,
  group: string,
  material: T,
): T {
  context.materials.register(group, material);
  return context.tracker.track(material);
}
