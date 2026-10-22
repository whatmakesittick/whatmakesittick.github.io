import {
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Quaternion,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import { ARM_ANCHOR, INSET, INSET_CENTRE, STATOR_PACK_M } from '../../../model';
import type { Point } from '../../../ids';
import type { PartContext } from '../context';
import { INK, INSET_GROUP, LAYER, OPACITY, STROKE } from './constants';
import { flatMesh } from './flat';
import { STATOR_DRAWING } from './layout';
import { merged, positionsOnly } from './strokes';

const TUBE_SIDES = 8;
const UP = new Vector3(0, 1, 0);
const SIDES = [-1, 1] as const;

function panelEnd(side: number): Vector3 {
  const [x, y, z] = INSET_CENTRE;
  return new Vector3(x + side * STATOR_DRAWING.packHalf, y - INSET.height / 2, z);
}

function armEnd(side: number): Vector3 {
  const [x, y, z]: Point = ARM_ANCHOR;
  return new Vector3(x + (side * STATOR_PACK_M) / 2, y, z);
}

function tube(from: Vector3, to: Vector3): BufferGeometry {
  const span = new Vector3().subVectors(to, from);
  const geometry = new CylinderGeometry(
    STROKE.leaderRadius,
    STROKE.leaderRadius,
    span.length(),
    TUBE_SIDES,
    1,
    true,
  );
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(UP, span.clone().normalize()));
  const middle = from.clone().add(to).multiplyScalar(0.5);
  geometry.translate(middle.x, middle.y, middle.z);
  return positionsOnly(geometry);
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
  const lines = merged(SIDES.map((side) => tube(panelEnd(side), armEnd(side))));
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
