import type { Box3, Group, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import type { Steps } from '@core/scene/pacing';
import type { SceneTextures } from '@core/scene/textures';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import type { FigureRig } from './parts/swimmer/figure/figureRig';
import { createSwimAssembly } from './swimAssembly';

export interface AssemblyResources {
  materials: MaterialLibrary;
  textures: SceneTextures;
  rig: FigureRig;
}

export interface Assembly {
  readonly root: Group;
  setState(state: AssemblyState): void;
  update(deltaSeconds: number, cameraDistance: number): boolean;
  labelAnchors(): ReadonlyMap<PartId, Object3D>;
  anchor(id: AnchorId): Object3D;
  region(id: RegionId): Box3;
  warmUp?(compile: (object: Object3D) => void): void;
  dispose(): void;
}

export function createAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Steps<Assembly> {
  return createSwimAssembly(resources, state);
}
