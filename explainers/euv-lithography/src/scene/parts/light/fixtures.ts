import { Mesh, Vector3 } from 'three';
import type { InstancedMesh, Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { runNow } from '@core/scene/pacing';
import type { Steps } from '@core/scene/pacing';
import { ResourceTracker } from '@core/scene/resources';
import { createSceneTextures } from '@core/scene/textures';
import type { AssemblyState, MachineId, ViewOptions } from '../../../ids';
import { opticsOf } from '../../../model/optics';
import { bounceCountAt, flashAt, insetAt, lightLeftAt, scanAt } from '../../../model/run';
import type { PartContext, Section } from '../context';

export const VIEWS: ViewOptions = {
  beam: true,
  labels: true,
  cutaway: true,
  inset: true,
  follow: false,
};
export const CAMERA_POSITION = new Vector3(0, 6, 24);
export const FRAME = {
  delta: 1 / 60,
  elapsed: 0,
  cameraDistance: 10,
  cameraPosition: CAMERA_POSITION,
};

export function stateAt(
  units: number,
  options: { machine?: MachineId; playing?: boolean; view?: Partial<ViewOptions> } = {},
): AssemblyState {
  const machine = options.machine ?? 'nxe3600d';
  return {
    phase: units,
    playing: options.playing ?? false,
    machine,
    optics: opticsOf(machine),
    flash: flashAt(units, machine),
    light: { left: lightLeftAt(units), bounces: bounceCountAt(units) },
    inset: insetAt(units),
    scan: scanAt(units, machine),
    view: { ...VIEWS, ...options.view },
  };
}

export function contextOf(): PartContext {
  return {
    materials: new MaterialLibrary(),
    tracker: new ResourceTracker(),
    textures: createSceneTextures(),
    labels: new Map(),
    anchors: {},
  };
}

export function buildSection(
  build: (context: PartContext) => Steps<Section>,
  state: AssemblyState,
): { section: Section; context: PartContext } {
  const context = contextOf();
  const section = runNow(build(context));
  section.setState(state);
  return { section, context };
}

export function triangles(root: Object3D): number {
  let total = 0;
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const { geometry } = object;
    const count = geometry.index ? geometry.index.count : geometry.getAttribute('position').count;
    total += (count / 3) * ((object as InstancedMesh).count ?? 1);
  });
  return total;
}

export function drawCalls(root: Object3D): number {
  let total = 0;
  root.traverse((object) => {
    if (object.type === 'Mesh' || object.type === 'InstancedMesh' || object.type === 'Points')
      total += 1;
    if (object.type === 'Sprite') total += 1;
  });
  return total;
}
