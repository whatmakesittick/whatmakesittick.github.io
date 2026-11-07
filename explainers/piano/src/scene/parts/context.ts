import { Group, InstancedMesh, Mesh } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import type { MaterialFinish, MaterialLibrary, STRUCTURE_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import type { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { AnchorId, AssemblyState, PartId, Point } from '../../ids';
import { UNCUT_FINISHES } from '../finishes';
import { applyCut } from './cut';
import type { CutMode, CutUniforms } from './cut';

export type EmphasisGroup = PartId | typeof STRUCTURE_GROUP | typeof UNDIMMED_GROUP;

const UNCUT_GROUPS: ReadonlySet<EmphasisGroup> = new Set<EmphasisGroup>([
  'case',
  'pedals',
  'inset',
  'upright',
  'harpsichord',
  UNDIMMED_GROUP,
]);

export interface PartContext {
  readonly materials: MaterialLibrary;
  readonly tracker: ResourceTracker;
  readonly textures: SceneTextures;
  readonly labels: Map<PartId, Object3D>;
  readonly anchors: Partial<Record<AnchorId, Object3D>>;
  readonly cut: CutUniforms;
}

export interface Frame {
  readonly delta: number;
  readonly elapsed: number;
  readonly cameraDistance: number;
}

export interface Section {
  readonly root: Object3D;
  setState(state: AssemblyState): void;
  animate?(frame: Frame, state: AssemblyState): boolean;
  warmUp?(compile: (object: Object3D) => void): void;
}

export type SectionFactory = (context: PartContext) => Section;

export function namedGroup(name: string, parent?: Object3D): Group {
  const group = new Group();
  group.name = name;
  parent?.add(group);
  return group;
}

export function label(
  context: PartContext,
  part: PartId,
  parent: Object3D,
  point: Point,
): Object3D {
  const anchor = anchorAt(parent, ...point);
  context.labels.set(part, anchor);
  return anchor;
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

export function isCut(group: EmphasisGroup, finish: MaterialFinish): boolean {
  return !UNCUT_GROUPS.has(group) && !UNCUT_FINISHES.has(finish);
}

export function partMaterial(
  context: PartContext,
  group: EmphasisGroup,
  finish: MaterialFinish,
): Material {
  const material = context.materials.get(group, finish);
  return isCut(group, finish) ? applyCut(material, context.cut) : material;
}

export function cutPartMaterial(
  context: PartContext,
  group: EmphasisGroup,
  finish: MaterialFinish,
  mode: CutMode,
): Material {
  return applyCut(context.materials.get(group, finish), context.cut, mode);
}

export function partMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: MaterialFinish,
): Mesh {
  const mesh = new Mesh(context.tracker.track(geometry), partMaterial(context, group, finish));
  mesh.name = group;
  return mesh;
}

export function partInstances(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: MaterialFinish,
  count: number,
): InstancedMesh {
  const mesh = new InstancedMesh(
    context.tracker.track(geometry),
    partMaterial(context, group, finish),
    count,
  );
  mesh.name = group;
  return context.tracker.track(mesh);
}

export function registeredMaterial<M extends Material>(
  context: PartContext,
  group: EmphasisGroup,
  material: M,
  cut = !UNCUT_GROUPS.has(group),
): M {
  context.materials.register(group, context.tracker.track(material));
  return cut ? applyCut(material, context.cut) : material;
}
