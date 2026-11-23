import type { Box3, Camera, Group, Object3D } from 'three';
import type { Rect } from '@core/scene/labelLayout';
import type { ViewportSize } from '@core/scene/lens';
import type { MaterialLibrary } from '@core/scene/materials';
import type { Steps } from '@core/scene/pacing';
import type { SceneTextures } from '@core/scene/textures';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import { createRunAssembly } from './runAssembly';
import type { PoseSolver, RunnerBuilder } from './runnerSlot';

export interface AssemblyResources {
  materials: MaterialLibrary;
  textures: SceneTextures;
  solvePose?: PoseSolver;
  buildRunner?: RunnerBuilder;
}

export interface ChaseTarget {
  position: { x: number; y: number; z: number };
  heading: number;
}

export interface Assembly {
  readonly root: Group;
  setState(state: AssemblyState): void;
  update(deltaSeconds: number, cameraDistance: number): boolean;
  fitTags(camera: Camera, frame: ViewportSize, keepOut: readonly Rect[]): Rect[];
  nameParts(parts: ReadonlySet<PartId>): void;
  labelAnchors(): ReadonlyMap<PartId, Object3D>;
  anchor(id: AnchorId): Object3D;
  region(id: RegionId): Box3;
  chaseTarget(): ChaseTarget;
  warmUp?(compile: (object: Object3D) => void): void;
  dispose(): void;
}

export function createAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Steps<Assembly> {
  return createRunAssembly(resources, state);
}
