import { Mesh } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import type { MaterialFinish, MaterialLibrary, STRUCTURE_GROUP } from '@core/scene/materials';
import type { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { PartId } from '../../ids';
import type { Finishes } from '../finishes';
import type { RevolvedShell } from '../geometry/revolve';

export type EmphasisGroup = PartId | typeof STRUCTURE_GROUP;

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
  finishes: Finishes;
  cutaway: CutawaySwitch;
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

export interface ShellLook {
  outer: MaterialFinish;
  cavity?: MaterialFinish;
  cap?: MaterialFinish;
}

export function shellMeshes(
  context: PartContext,
  parent: Object3D,
  shell: RevolvedShell,
  group: EmphasisGroup,
  look: ShellLook,
): Mesh[] {
  const { cutaway, finishes } = context;
  const meshes = [
    cutaway.whole(partMesh(context, shell.whole, group, look.outer)),
    cutaway.opened(partMesh(context, shell.half, group, look.outer)),
    cutaway.opened(partMesh(context, shell.cap, group, look.cap ?? finishes.cut)),
  ];
  if (shell.cavity) {
    meshes.push(
      cutaway.opened(partMesh(context, shell.cavity, group, look.cavity ?? finishes.cavity)),
    );
  }
  meshes.forEach((mesh) => parent.add(mesh));
  return meshes;
}
