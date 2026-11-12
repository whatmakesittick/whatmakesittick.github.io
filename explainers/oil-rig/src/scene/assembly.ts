import type { Box3, Group, Object3D } from 'three';
import { runPaced } from '@core/scene/pacing';
import type { MaterialLibrary } from '@core/scene/materials';
import type { SceneTextures } from '@core/scene/textures';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import { buildRigAssembly } from './rigAssembly';

export interface AssemblyResources {
  materials: MaterialLibrary;
  textures: SceneTextures;
}

export interface Assembly {
  readonly root: Group;
  setState(state: AssemblyState): void;
  update(deltaSeconds: number, cameraDistance: number): boolean;
  labelAnchors(): ReadonlyMap<PartId, Object3D>;
  anchor(id: AnchorId): Object3D;
  region(id: RegionId): Box3;
  dispose(): void;
}

export function createAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Promise<Assembly> {
  return runPaced(buildRigAssembly(resources, state));
}
