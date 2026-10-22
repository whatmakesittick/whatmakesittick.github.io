import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import type { Object3D } from 'three';
import { ARM_ANCHOR, INSET, INSET_CENTRE, STATOR_PACK_M } from '../../../model';
import type { Point } from '../../../ids';
import type { PartContext } from '../context';
import { INK, INSET_GROUP, LAYER, OPACITY, STROKE } from './constants';
import { flatMesh } from './flat';
import { STATOR_DRAWING } from './layout';
import { cylinderBetween } from '../line/geometry';
import { merged } from './strokes';

const TUBE_SIDES = 8;
const SIDES = [-1, 1] as const;

function panelEnd(side: number): Vector3 {
  const [x, y, z] = INSET_CENTRE;
  return new Vector3(x + side * STATOR_DRAWING.packHalf, y - INSET.height / 2, z);
}

function armEnd(side: number): Vector3 {
  const [x, y, z]: Point = ARM_ANCHOR;
  return new Vector3(x + (side * STATOR_PACK_M) / 2, y, z);
}

function tube(side: number): BufferGeometry {
  const radius = STROKE.leaderRadius;
  return cylinderBetween(panelEnd(side), armEnd(side), [radius, radius], TUBE_SIDES);
}

function wedge(): BufferGeometry {
  const [a, b] = SIDES.map(panelEnd);
  const [c, d] = SIDES.map(armEnd);
  const corners = [a, b, d, a, d, c].flatMap((point) => point.toArray());
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(corners, 3));
  return geometry;
}

export function buildLeader(context: PartContext): Object3D[] {
  const lines = merged(SIDES.map(tube));
  return [
    flatMesh(
      context,
      lines,
      INSET_GROUP,
      { colour: INK.frame, opacity: OPACITY.leader },
      LAYER.leader,
    ),
    flatMesh(
      context,
      wedge(),
      INSET_GROUP,
      { colour: INK.frame, opacity: OPACITY.wedge, doubleSided: true },
      LAYER.leader,
    ),
  ];
}
