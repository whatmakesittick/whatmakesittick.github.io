import type { Box3, Group, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import type { SceneTextures } from '@core/scene/textures';
import type { AnchorId, AssemblyState, ChaseTarget, PartId, RegionId } from '../ids';
import { createThrusterCarAssembly } from './thrusterCarAssembly';

export type { ChaseTarget } from '../ids';

export interface AssemblyResources {
  materials: MaterialLibrary;
  textures: SceneTextures;
}

export interface Assembly {
  readonly root: Group;
  setState(state: AssemblyState): void;
  update(deltaSeconds: number): boolean;
  labelAnchors(): ReadonlyMap<PartId, Object3D>;
  anchor(id: AnchorId): Object3D;
  region(id: RegionId): Box3;
  chaseTarget(): ChaseTarget;
  warmUp?(compile: (object: Object3D) => void): void;
  dispose(): void;
}

export function createAssembly(resources: AssemblyResources, state: AssemblyState): Assembly {
  return createThrusterCarAssembly(resources, state);
}
