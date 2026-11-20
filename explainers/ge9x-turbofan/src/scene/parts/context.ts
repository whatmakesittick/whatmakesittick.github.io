import { Group, Mesh } from 'three';
import type { BufferGeometry, Material, MeshStandardMaterial, Object3D } from 'three';
import type { MaterialFinish, MaterialLibrary } from '@core/scene/materials';
import { STRUCTURE_GROUP, UNDIMMED_GROUP } from '@core/scene/materials';
import type { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { PartId } from '../../ids';
import type { CutDepth, CutUniforms } from './cut';
import { applyCut } from './cut';
import type { GlowScale, HeatUniforms } from './heat';
import { createGlowScale } from './heat';
import type { TimeUniform } from './effects';

export type EmphasisGroup = PartId | typeof STRUCTURE_GROUP | typeof UNDIMMED_GROUP;

export { STRUCTURE_GROUP, UNDIMMED_GROUP };

export interface PartContext {
  readonly materials: MaterialLibrary;
  readonly tracker: ResourceTracker;
  readonly textures: SceneTextures;
  readonly labels: Map<PartId, Object3D>;
  readonly cut: CutUniforms;
  readonly heat: HeatUniforms;
  readonly time: TimeUniform;
  readonly glow: Map<EmphasisGroup, GlowScale>;
}

export function namedGroup(name: string, parent?: Object3D): Group {
  const group = new Group();
  group.name = name;
  parent?.add(group);
  return group;
}

export function polar(
  x: number,
  radius: number,
  fromTop: number,
): readonly [number, number, number] {
  return [x, radius * Math.cos(fromTop), radius * Math.sin(fromTop)];
}

export function label(
  context: PartContext,
  part: PartId,
  parent: Object3D,
  point: readonly [number, number, number],
): Object3D {
  const anchor = namedGroup(`${part}Label`, parent);
  anchor.position.set(...point);
  context.labels.set(part, anchor);
  return anchor;
}

export function glowScale(context: PartContext, group: EmphasisGroup): GlowScale {
  const found = context.glow.get(group);
  if (found) return found;
  const created = createGlowScale();
  context.glow.set(group, created);
  return created;
}

export function material(
  context: PartContext,
  group: EmphasisGroup,
  finish: MaterialFinish,
): MeshStandardMaterial {
  return context.materials.get(group, finish);
}

export function cutMaterial(
  context: PartContext,
  group: EmphasisGroup,
  finish: MaterialFinish,
  depth: CutDepth = 'shell',
): MeshStandardMaterial {
  return applyCut(material(context, group, finish), context.cut, depth);
}

export function coreMaterial(
  context: PartContext,
  group: EmphasisGroup,
  finish: MaterialFinish,
): MeshStandardMaterial {
  return cutMaterial(context, group, finish, 'core');
}

export function mesh(
  context: PartContext,
  parent: Object3D,
  geometry: BufferGeometry,
  surface: Material,
): Mesh {
  const created = new Mesh(context.tracker.track(geometry), surface);
  created.name = parent.name;
  parent.add(created);
  return created;
}

export function registered<M extends Material>(
  context: PartContext,
  group: EmphasisGroup,
  shader: M,
): M {
  context.materials.register(group, context.tracker.track(shader));
  return shader;
}
