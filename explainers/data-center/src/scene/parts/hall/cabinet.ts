import { MeshStandardMaterial } from 'three';
import type { BufferGeometry, Material, Texture } from 'three';
import type { Point } from '../../../ids';
import { FINISHES } from '../../finishes';
import { registeredMaterial } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { boxAt, merged, panelAt } from './shapes';

export interface CabinetSize {
  width: number;
  height: number;
  depth: number;
  recess: number;
}

const SKIN_M = 0.012;
const LIP_M = 0.012;
const CAP_M = 0.04;
const RAIL_M = 0.024;
const KICK_M = 0.06;
const BACK_SHADE = '#7d838a';

export function cabinetFrontZ({ depth }: CabinetSize): number {
  return -depth / 2 + LIP_M;
}

export function cabinetBackZ({ depth, recess }: CabinetSize): number {
  return depth / 2 - recess;
}

export function cabinetGeometry(size: CabinetSize): BufferGeometry {
  const { width, height, depth } = size;
  const outer = width / 2;
  const inner = outer - SKIN_M;
  const front = -depth / 2;
  const back = depth / 2;
  const panelTop = height - CAP_M;
  const recessZ = cabinetBackZ(size);
  const frame = merged([
    boxAt([-outer, -inner], [0, height], [front, back]),
    boxAt([inner, outer], [0, height], [front, back]),
    boxAt([-inner, inner], [panelTop, height], [front, recessZ]),
    boxAt([-inner, inner], [panelTop, height], [back - RAIL_M, back]),
    boxAt([-inner, inner], [0, KICK_M], [recessZ, back]),
  ]);
  return merged(
    [
      frame,
      panelAt([-inner, inner], [0, panelTop], cabinetFrontZ(size), -1),
      panelAt([-inner, inner], [0, panelTop], recessZ, 1),
    ],
    true,
  );
}

export function cabinetMaterials(
  context: PartContext,
  group: EmphasisGroup,
  front: Texture,
  frame: Material = context.materials.get(group, FINISHES.darkRack),
): Material[] {
  const face = (color: string) =>
    registeredMaterial(
      context,
      group,
      new MeshStandardMaterial({ map: front, color, roughness: 0.62, metalness: 0.25 }),
    );
  return [frame, face('#ffffff'), face(BACK_SHADE)];
}

export function panelTopOf({ height }: CabinetSize): number {
  return height - CAP_M;
}

export function frontPoint(size: CabinetSize, x: number, y: number, out: number): Point {
  return [x, y, cabinetFrontZ(size) - out];
}
