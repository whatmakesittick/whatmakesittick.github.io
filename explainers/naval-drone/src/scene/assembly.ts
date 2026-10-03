import type { Box3, Group, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import type { SceneTextures } from '@core/scene/textures';
import type { AnchorId, AssemblyState, PartId, Point, RegionId } from '../ids';
import { createNavalDroneAssembly } from './navalDroneAssembly';

export interface AssemblyResources {
  materials: MaterialLibrary;
  textures: SceneTextures;
}

export interface ChaseTarget {
  position: Point;
  heading: number;
  length: number;
  ship: Point;
}

export interface Assembly {
  readonly root: Group;
  setState(state: AssemblyState): void;
  update(deltaSeconds: number, cameraDistance: number): boolean;
  labelAnchors(): ReadonlyMap<PartId, Object3D>;
  anchor(id: AnchorId): Object3D;
  region(id: RegionId): Box3;
  chaseTarget(): ChaseTarget;
  warmUp?(compile: (object: Object3D) => void): void;
  dispose(): void;
}

export function createAssembly(resources: AssemblyResources, state: AssemblyState): Assembly {
  return createNavalDroneAssembly(resources, state);
}
