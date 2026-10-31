import { BoxGeometry } from 'three';
import type { Group, InstancedMesh, Material, Object3D } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { AssemblyState, PartId, Point } from '../../../ids';
import type { BoxSpec } from '../../../model';
import { FINISHES } from '../../finishes';
import type { Finish } from '../../finishes';
import { boxMatrix, instancesOf, label, namedGroup } from '../context';
import type { EmphasisGroup, Frame, PartContext } from '../context';

export interface CampusPiece {
  setState?(state: AssemblyState): void;
  animate?(frame: Frame, state: AssemblyState): boolean;
}

export type PieceBuilder = (context: PartContext, root: Group) => CampusPiece;

const cubes = new WeakMap<PartContext, BoxGeometry>();

export function unitCube(context: PartContext): BoxGeometry {
  let cube = cubes.get(context);
  if (!cube) {
    cube = context.tracker.track(new BoxGeometry());
    cubes.set(context, cube);
  }
  return cube;
}

export function finishOf(finish: Finish | MaterialFinish): MaterialFinish {
  return typeof finish === 'string' ? FINISHES[finish] : finish;
}

export function materialOf(
  context: PartContext,
  group: EmphasisGroup,
  finish: Finish | MaterialFinish,
): Material {
  return context.materials.get(group, finishOf(finish));
}

export function boxes(
  context: PartContext,
  group: EmphasisGroup,
  finish: Finish | MaterialFinish,
  specs: readonly BoxSpec[],
  parent: Object3D,
): InstancedMesh {
  const mesh = instancesOf(
    context,
    unitCube(context),
    materialOf(context, group, finish),
    specs.map((spec) => boxMatrix(spec)),
  );
  parent.add(mesh);
  return mesh;
}

export function partGroup(
  context: PartContext,
  id: PartId,
  root: Object3D,
  labelPoint: Point,
): Group {
  const group = namedGroup(id, root);
  label(context, id, group, labelPoint);
  return group;
}
