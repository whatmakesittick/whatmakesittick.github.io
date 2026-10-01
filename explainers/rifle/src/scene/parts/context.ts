import { Mesh } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import type { MaterialFinish, MaterialLibrary, STRUCTURE_GROUP } from '@core/scene/materials';
import type { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { PartId } from '../../ids';
import type { Look, Looks } from '../finishes';
import type { CutPiece } from '../geometry/pieces';

export type EmphasisGroup = PartId | typeof STRUCTURE_GROUP;

export type CutawayRole = 'whole' | 'opened' | 'always';

export const DYNAMIC = 'dynamic';

export function markDynamic<T extends Object3D>(object: T): T {
  object.userData[DYNAMIC] = true;
  return object;
}

export class CutawaySwitch {
  private readonly wholeParts: Object3D[] = [];
  private readonly cutParts: Object3D[] = [];
  private cut = false;

  whole<T extends Object3D>(object: T): T {
    this.wholeParts.push(object);
    object.visible = !this.cut;
    return object;
  }

  opened<T extends Object3D>(object: T): T {
    this.cutParts.push(object);
    object.visible = this.cut;
    return object;
  }

  get isCut(): boolean {
    return this.cut;
  }

  roleOf(object: Object3D): CutawayRole {
    if (this.wholeParts.includes(object)) return 'whole';
    if (this.cutParts.includes(object)) return 'opened';
    return 'always';
  }

  forget(objects: readonly Object3D[]): void {
    for (const list of [this.wholeParts, this.cutParts]) {
      for (const object of objects) {
        const index = list.indexOf(object);
        if (index >= 0) list.splice(index, 1);
      }
    }
  }

  adopt<T extends Object3D>(object: T, role: CutawayRole): T {
    if (role === 'whole') return this.whole(object);
    if (role === 'opened') return this.opened(object);
    return object;
  }

  set(cut: boolean): void {
    this.cut = cut;
    this.wholeParts.forEach((object) => (object.visible = !cut));
    this.cutParts.forEach((object) => (object.visible = cut));
  }
}

export interface PartContext {
  materials: MaterialLibrary;
  tracker: ResourceTracker;
  textures: SceneTextures;
  cutaway: CutawaySwitch;
  looks: Looks;
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

export function addPiece(
  context: PartContext,
  parent: Object3D,
  cutPiece: CutPiece,
  group: EmphasisGroup,
  look: Look,
): Mesh[] {
  const { cutaway } = context;
  const mesh = (geometry: BufferGeometry, finish: MaterialFinish) =>
    partMesh(context, geometry, group, finish);
  const meshes =
    cutPiece.kind === 'kept'
      ? [mesh(cutPiece.geometry, look.surface)]
      : cutPiece.kind === 'removed'
        ? [cutaway.whole(mesh(cutPiece.geometry, look.surface))]
        : [
            cutaway.whole(mesh(cutPiece.whole, look.surface)),
            cutaway.opened(mesh(cutPiece.half, look.surface)),
            ...(cutPiece.face ? [cutaway.opened(mesh(cutPiece.face, look.cut))] : []),
          ];
  meshes.forEach((child) => parent.add(child));
  return meshes;
}
