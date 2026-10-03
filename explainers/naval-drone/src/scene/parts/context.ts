import { InstancedMesh, Mesh } from 'three';
import type { BufferGeometry, Material, Matrix4 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type {
  MaterialFinish,
  MaterialLibrary,
  STRUCTURE_GROUP,
  UNDIMMED_GROUP,
} from '@core/scene/materials';
import type { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { PartId } from '../../ids';
import type { BoatLooks } from '../finishes';

export type EmphasisGroup = PartId | typeof STRUCTURE_GROUP | typeof UNDIMMED_GROUP;

export interface PartContext {
  materials: MaterialLibrary;
  textures: SceneTextures;
  tracker: ResourceTracker;
  looks: BoatLooks;
}

export function partMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: MaterialFinish,
): Mesh {
  return new Mesh(context.tracker.track(geometry), context.materials.get(group, finish));
}

export function registered<T extends Material>(
  context: PartContext,
  group: EmphasisGroup,
  material: T,
): T {
  context.materials.register(group, context.tracker.track(material));
  return material;
}

export function instanced(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: MaterialFinish,
  matrices: readonly Matrix4[],
): InstancedMesh {
  const mesh = new InstancedMesh(
    context.tracker.track(geometry),
    context.materials.get(group, finish),
    matrices.length,
  );
  matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

function sharedAttributes(parts: readonly BufferGeometry[]): string[] {
  const [first, ...rest] = parts;
  return Object.keys(first.attributes).filter((name) =>
    rest.every((part) => part.getAttribute(name) !== undefined),
  );
}

export function mergeParts(parts: readonly BufferGeometry[]): BufferGeometry {
  if (parts.length === 1) return parts[0];
  const indexed = parts.every((part) => part.index !== null);
  const prepared = parts.map((part) => (indexed || !part.index ? part : part.toNonIndexed()));
  const names = sharedAttributes(prepared);
  prepared.forEach((part) =>
    Object.keys(part.attributes)
      .filter((name) => !names.includes(name))
      .forEach((name) => part.deleteAttribute(name)),
  );
  const merged = mergeGeometries(prepared);
  new Set([...parts, ...prepared]).forEach((part) => part.dispose());
  if (!merged) throw new Error('Could not merge the part geometries');
  return merged;
}
