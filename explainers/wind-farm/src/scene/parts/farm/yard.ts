import { CylinderGeometry } from 'three';
import type { BufferGeometry } from 'three';
import type { Point } from '../../../ids';
import { strut, slab } from './geometry';

const ROUND_SEGMENTS = 10;
const QUARTER_TURN = Math.PI / 2;
const KNEE_M = 2.5;

export const TRANSFORMER = {
  plinth: [11, 0.6, 7] as Point,
  body: [9, 6, 5] as Point,
  fins: 7,
  fin: [2.4, 4.6, 0.18] as Point,
  finPitch: 0.68,
  bushings: 3,
  bushingRadius: 0.22,
  bushingHeight: 2.6,
  conservatorRadius: 0.6,
  conservatorLength: 3.6,
} as const;

export const GANTRY = {
  height: 12,
  column: 0.55,
  beam: 0.45,
  brace: 0.2,
  busbarRadius: 0.12,
} as const;

export interface TransformerPieces {
  readonly plinth: BufferGeometry;
  readonly body: BufferGeometry[];
  readonly fins: BufferGeometry[];
  readonly bushings: BufferGeometry[];
}

function cylinder(radius: number, height: number, [x, y, z]: Point): BufferGeometry {
  return new CylinderGeometry(radius, radius, height, ROUND_SEGMENTS).translate(
    x,
    y + height / 2,
    z,
  );
}

export function transformerPieces([x, z]: readonly [number, number]): TransformerPieces {
  const [plinthX, plinthY, plinthZ] = TRANSFORMER.plinth;
  const [bodyX, bodyY, bodyZ] = TRANSFORMER.body;
  const [finX, finY, finZ] = TRANSFORMER.fin;
  const top = plinthY + bodyY;
  const east = x + bodyX / 2;
  const fins = Array.from({ length: TRANSFORMER.fins }, (_, index) => {
    const finCentreZ = z + (index - (TRANSFORMER.fins - 1) / 2) * TRANSFORMER.finPitch;
    return slab(
      [east, plinthY + (bodyY - finY) / 2, finCentreZ - finZ / 2],
      [east + finX, plinthY + (bodyY + finY) / 2, finCentreZ + finZ / 2],
    );
  });
  const conservator = new CylinderGeometry(
    TRANSFORMER.conservatorRadius,
    TRANSFORMER.conservatorRadius,
    TRANSFORMER.conservatorLength,
    ROUND_SEGMENTS,
  )
    .rotateX(QUARTER_TURN)
    .translate(
      x - bodyX / 2 + TRANSFORMER.conservatorRadius,
      top + TRANSFORMER.conservatorRadius * 2,
      z,
    );
  const bushings = Array.from({ length: TRANSFORMER.bushings }, (_, index) =>
    cylinder(TRANSFORMER.bushingRadius, TRANSFORMER.bushingHeight, [
      x,
      top,
      z + (index - (TRANSFORMER.bushings - 1) / 2) * (bodyZ / TRANSFORMER.bushings),
    ]),
  );
  return {
    plinth: slab(
      [x - plinthX / 2, 0, z - plinthZ / 2],
      [x + plinthX / 2, plinthY, z + plinthZ / 2],
    ),
    body: [
      slab([x - bodyX / 2, plinthY, z - bodyZ / 2], [x + bodyX / 2, top, z + bodyZ / 2]),
      conservator,
    ],
    fins,
    bushings,
  };
}

export function gantry(x: number, halfSpan: number): BufferGeometry[] {
  const { height, column, beam, brace } = GANTRY;
  const legs = [-halfSpan, halfSpan].flatMap((z) => [
    slab([x - column / 2, 0, z - column / 2], [x + column / 2, height, z + column / 2]),
    strut([x, height - KNEE_M, z], [x, height - beam, z - Math.sign(z) * KNEE_M], brace),
  ]);
  const top = slab([x - beam / 2, height - beam, -halfSpan], [x + beam / 2, height, halfSpan]);
  return [...legs, top];
}

export function busbar(fromX: number, toX: number, y: number, z: number): BufferGeometry {
  return new CylinderGeometry(GANTRY.busbarRadius, GANTRY.busbarRadius, toX - fromX, ROUND_SEGMENTS)
    .rotateZ(QUARTER_TURN)
    .translate((fromX + toX) / 2, y, z);
}
