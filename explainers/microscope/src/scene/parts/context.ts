import { Group, Mesh } from 'three';
import type { BufferGeometry, Material } from 'three';
import type {
  MaterialFinish,
  MaterialLibrary,
  STRUCTURE_GROUP,
  UNDIMMED_GROUP,
} from '@core/scene/materials';
import type { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { PartId } from '../../state';
import { FINISHES } from '../finishes';
import type { Finish } from '../finishes';
import type { CutGeometry } from '../geometry/lathe';

export type EmphasisGroup = PartId | typeof STRUCTURE_GROUP | typeof UNDIMMED_GROUP;

export interface PartContext {
  materials: MaterialLibrary;
  tracker: ResourceTracker;
  textures: SceneTextures;
}

export interface CutShell {
  object: Group;
  setCut(cut: boolean): void;
}

export function partMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: Finish,
): Mesh {
  return finishMesh(context, geometry, group, FINISHES[finish]);
}

export function finishMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: MaterialFinish,
): Mesh {
  return new Mesh(context.tracker.track(geometry), context.materials.get(group, finish));
}

export function registeredMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  material: Material,
): Mesh {
  context.materials.register(group, context.tracker.track(material));
  return new Mesh(context.tracker.track(geometry), material);
}

export function cutShell(
  context: PartContext,
  geometry: CutGeometry,
  group: EmphasisGroup,
  finish: MaterialFinish,
): CutShell {
  const whole = finishMesh(context, geometry.whole, group, finish);
  const cut = [finishMesh(context, geometry.back, group, finish)];
  if (geometry.caps) cut.push(partMesh(context, geometry.caps, group, 'cut'));
  if (geometry.lining) cut.push(partMesh(context, geometry.lining, group, 'interior'));
  const object = new Group();
  object.add(whole, ...cut);
  const setCut = (isCut: boolean) => {
    whole.visible = !isCut;
    cut.forEach((mesh) => (mesh.visible = isCut));
  };
  setCut(false);
  return { object, setCut };
}
