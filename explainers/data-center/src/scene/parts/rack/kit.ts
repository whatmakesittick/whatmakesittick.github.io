import { BoxGeometry, Matrix4, Quaternion, Vector3 } from 'three';
import type { BufferGeometry, Group, InstancedMesh, Material } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { Extent } from '@core/scene/regions';
import type { PartId, Point } from '../../../ids';
import { spanning } from '../../../model';
import type { BoxSpec } from '../../../model';
import { FINISHES } from '../../finishes';
import type { Finish } from '../../finishes';
import { boxMatrix, instancesOf } from '../context';
import type { PartContext } from '../context';

export type Look = Finish | MaterialFinish;

const X_AXIS = new Vector3(1, 0, 0);
const UPRIGHT = new Quaternion();
const LYING = new Quaternion().setFromAxisAngle(X_AXIS, Math.PI / 2);

export interface Kit {
  readonly context: PartContext;
  readonly cube: BufferGeometry;
  material(part: PartId, look: Look): Material;
  copies(
    parent: Group,
    part: PartId,
    look: Look,
    geometry: BufferGeometry,
    matrices: readonly Matrix4[],
  ): InstancedMesh;
  boxes(parent: Group, part: PartId, look: Look, boxes: readonly BoxSpec[]): InstancedMesh;
}

export function createKit(context: PartContext): Kit {
  const cube = context.tracker.track(new BoxGeometry());
  const material = (part: PartId, look: Look) =>
    context.materials.get(part, typeof look === 'string' ? FINISHES[look] : look);
  const copies: Kit['copies'] = (parent, part, look, geometry, matrices) => {
    const mesh = instancesOf(context, geometry, material(part, look), matrices);
    mesh.name = part;
    parent.add(mesh);
    return mesh;
  };
  const boxes: Kit['boxes'] = (parent, part, look, specs) =>
    copies(
      parent,
      part,
      look,
      cube,
      specs.map((spec) => boxMatrix(spec)),
    );
  return { context, cube, material, copies, boxes };
}

export const box = spanning;

export function lifted({ base: [x, y, z], size }: BoxSpec, rise: number): BoxSpec {
  return { base: [x, y + rise, z], size };
}

export function perBand(bands: readonly Extent[], local: readonly BoxSpec[]): BoxSpec[] {
  return bands.flatMap(([bottom]) => local.map((spec) => lifted(spec, bottom)));
}

export function rod([x, y, z]: Point, radius: number, length: number, lying = false): Matrix4 {
  return new Matrix4().compose(
    new Vector3(x, y, z),
    lying ? LYING : UPRIGHT,
    new Vector3(radius, length, radius),
  );
}
