import { Shape } from 'three';
import type { BufferGeometry } from 'three';
import { BEAM_M } from '../../../model';
import { BEARING, DECK, PIER_SHAPE } from './constants';
import {
  around,
  boxOver,
  boxProjectUVs,
  extrudeAlongX,
  mergeParts,
  mirrored,
  profileShape,
} from './geometry';
import type { Span } from './geometry';
import { GIRDER_HALF, girderShape } from './profiles';
import { extrudePlan, planShape } from '@core/scene/geometry/extrude';

const CONCRETE_REPEAT_M = 6;
const HALF_BEAM = BEAM_M / 2;

function girder(detailed: boolean): BufferGeometry {
  const half = HALF_BEAM - DECK.joint / 2;
  if (detailed) return extrudeAlongX(girderShape(), -half, half, DECK.endChamfer);
  return extrudeAlongX(profileShape(mirrored(GIRDER_HALF)), -half, half);
}

function chamferedSquare(half: number, chamfer: number): Shape {
  const inner = half - chamfer;
  return planShape([
    { x: -inner, z: -half },
    { x: inner, z: -half },
    { x: half, z: -inner },
    { x: half, z: inner },
    { x: inner, z: half },
    { x: -inner, z: half },
    { x: -half, z: inner },
    { x: -half, z: -inner },
  ]);
}

function pierCap(curveSegments: number): BufferGeometry {
  const { half, capHalf, capFlareBottom, capFlareTop } = PIER_SHAPE;
  const top = DECK.bottom - PIER_SHAPE.bearingHeight;
  const shape = new Shape();
  shape.moveTo(-half, capFlareBottom);
  shape.lineTo(half, capFlareBottom);
  shape.quadraticCurveTo(half, capFlareTop, capHalf, capFlareTop);
  shape.lineTo(capHalf, top);
  shape.lineTo(-capHalf, top);
  shape.lineTo(-capHalf, capFlareTop);
  shape.quadraticCurveTo(-half, capFlareTop, -half, capFlareBottom);
  return extrudeAlongX(shape, -half, half, PIER_SHAPE.chamfer / 2, curveSegments);
}

function pier(detailed: boolean): BufferGeometry {
  const { half, chamfer, footingHalf, footingChamfer, footingTop, footingBottom } = PIER_SHAPE;
  const shaft = extrudePlan(chamferedSquare(half, chamfer), footingTop, PIER_SHAPE.capFlareBottom);
  const footing = extrudePlan(
    chamferedSquare(footingHalf, footingChamfer),
    footingBottom,
    footingTop,
  );
  const curves = detailed ? PIER_SHAPE.curveSegments : PIER_SHAPE.farCurveSegments;
  const parts = [shaft, footing, pierCap(curves)];
  parts.forEach((part) => part.translate(-HALF_BEAM, 0, 0));
  return mergeParts(parts);
}

export function concreteModule(detailed: boolean): BufferGeometry {
  return boxProjectUVs(mergeParts([girder(detailed), pier(detailed)]), CONCRETE_REPEAT_M);
}

function bearing(x: number, z: number): BufferGeometry {
  const height: Span = [DECK.bottom - PIER_SHAPE.bearingHeight, DECK.bottom];
  return boxOver(around(x, BEARING.size), height, around(z, BEARING.size));
}

export function bearingModule(): BufferGeometry {
  const spots = [-1, 1].flatMap((alongSign) =>
    [-1, 1].map((sideSign) => bearing(-HALF_BEAM + alongSign * BEARING.x, sideSign * BEARING.z)),
  );
  return mergeParts(spots);
}
