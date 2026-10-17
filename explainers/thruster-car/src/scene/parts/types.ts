import type { BufferGeometry, Object3D } from 'three';
import type { AssemblyState, CarAnchorId, NozzleId, PartId, SiteAnchorId } from '../../ids';

export interface ScenePart {
  readonly object: Object3D;
  readonly labels: ReadonlyMap<PartId, Object3D>;
}

export interface CarView extends ScenePart {
  readonly anchors: Readonly<Record<CarAnchorId, Object3D>>;
  nozzle(id: NozzleId): Object3D;
  silhouette(): BufferGeometry;
  setState(state: AssemblyState): void;
}

export interface WorldView extends ScenePart {
  readonly anchors: Readonly<Record<SiteAnchorId, Object3D>>;
}

export interface EffectsView extends ScenePart {
  setState(state: AssemblyState): void;
  advance(deltaSeconds: number): boolean;
}
