import { Shape } from 'three';
import type { BufferGeometry } from 'three';
import { BEAM_M } from '../../../model';
import { BEARING, DECK, PIER_SHAPE } from './constants';
import {
  boxOver,
  boxProjectUVs,
  extrudeAlongX,
  mergeParts,
  mirrored,
  profileShape,
} from './geometry';
import type { ProfilePoint } from './geometry';
import { extrudePlan, planShape } from '@core/scene/geometry/extrude';

const CONCRETE_REPEAT_M = 6;
const HALF_BEAM = BEAM_M / 2;

const GIRDER_HALF: readonly ProfilePoint[] = [
  [0, DECK.top],
  [DECK.concreteEdge, DECK.top],
  [DECK.concreteEdge, DECK.flangeUnderside],
  [DECK.haunch.z, DECK.haunch.y],
  [DECK.webFoot.z, DECK.webFoot.y],
  [DECK.bottomHalf, DECK.bottom],
  [0, DECK.bottom],
];

function girder(): BufferGeometry {
  const shape = profileShape(mirrored(GIRDER_HALF));
  const half = HALF_BEAM - DECK.joint / 2;
  return extrudeAlongX(shape, -half, half, DECK.endChamfer);
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

function pierCap(): BufferGeometry {
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
  return extrudeAlongX(shape, -half, half, PIER_SHAPE.chamfer / 2);
}

function pier(): BufferGeometry {
  const { half, chamfer, footingHalf, footingChamfer, footingTop, footingBottom } = PIER_SHAPE;
  const shaft = extrudePlan(chamferedSquare(half, chamfer), footingTop, PIER_SHAPE.capFlareBottom);
  const footing = extrudePlan(
    chamferedSquare(footingHalf, footingChamfer),
    footingBottom,
    footingTop,
  );
  const parts = [shaft, footing, pierCap()];
  parts.forEach((part) => part.translate(-HALF_BEAM, 0, 0));
  return mergeParts(parts);
}

export function concreteModule(): BufferGeometry {
  return boxProjectUVs(mergeParts([girder(), pier()]), CONCRETE_REPEAT_M);
}

function bearing(x: number, z: number): BufferGeometry {
  const pad = BEARING.size / 2;
  const top = DECK.bottom;
  return boxOver([x - pad, x + pad], [top - PIER_SHAPE.bearingHeight, top], [z - pad, z + pad]);
}

export function bearingModule(): BufferGeometry {
  const spots = [-1, 1].flatMap((alongSign) =>
    [-1, 1].map((sideSign) => bearing(-HALF_BEAM + alongSign * BEARING.x, sideSign * BEARING.z)),
  );
  return mergeParts(spots);
}
