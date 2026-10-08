import { Group, InstancedMesh, Mesh } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import type {
  MaterialFinish,
  MaterialLibrary,
  STRUCTURE_GROUP,
  UNDIMMED_GROUP,
} from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import type { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { AnchorId, AssemblyState, PartId, Point } from '../../ids';
import { FINISHES, PART_FINISHES } from '../finishes';
import type { Finish } from '../finishes';

export type EmphasisGroup = PartId | typeof STRUCTURE_GROUP | typeof UNDIMMED_GROUP;

export interface PartContext {
  readonly materials: MaterialLibrary;
  readonly tracker: ResourceTracker;
  readonly textures: SceneTextures;
  readonly labels: Map<PartId, Object3D>;
  readonly anchors: Partial<Record<AnchorId, Object3D>>;
}

export interface Motion {
  readonly delta: number;
  readonly azimuth: number;
  readonly pitchDeg: number;
  readonly rpm: number;
  readonly cameraDistance: number;
}

export interface Section {
  readonly root: Object3D;
  setState(state: AssemblyState): void;
  animate?(motion: Motion, state: AssemblyState): boolean;
}

const DEGREES_TO_RADIANS = Math.PI / 180;
const FACING_WEST_DEG = 270;

export function degrees(value: number): number {
  return value * DEGREES_TO_RADIANS;
}

export function bearingTurn(bearingDeg: number): number {
  return (FACING_WEST_DEG - bearingDeg) * DEGREES_TO_RADIANS;
}

export function namedGroup(name: string, parent?: Object3D): Group {
  const group = new Group();
  group.name = name;
  parent?.add(group);
  return group;
}

export function label(context: PartContext, part: PartId, parent: Object3D, point: Point): void {
  context.labels.set(part, anchorAt(parent, ...point));
}

export function sceneAnchor(
  context: PartContext,
  id: AnchorId,
  parent: Object3D,
  point: Point,
): Object3D {
  const anchor = anchorAt(parent, ...point);
  context.anchors[id] = anchor;
  return anchor;
}

export function finishMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: MaterialFinish,
): Mesh {
  return new Mesh(context.tracker.track(geometry), context.materials.get(group, finish));
}

export function partMesh(
  context: PartContext,
  geometry: BufferGeometry,
  part: PartId,
  finish: Finish = PART_FINISHES[part],
): Mesh {
  const mesh = finishMesh(context, geometry, part, FINISHES[finish]);
  mesh.name = part;
  return mesh;
}

export function groupMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: Finish,
): Mesh {
  return finishMesh(context, geometry, group, FINISHES[finish]);
}

export function registeredMaterial<M extends Material>(
  context: PartContext,
  group: EmphasisGroup,
  material: M,
): M {
  context.materials.register(group, context.tracker.track(material));
  return material;
}

export function registeredMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  material: Material,
): Mesh {
  return new Mesh(context.tracker.track(geometry), registeredMaterial(context, group, material));
}

export function instancedMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: Finish,
  count: number,
): InstancedMesh {
  const material = context.materials.get(group, FINISHES[finish]);
  return context.tracker.track(new InstancedMesh(context.tracker.track(geometry), material, count));
}
