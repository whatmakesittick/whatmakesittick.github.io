import { CylinderGeometry } from 'three';
import type { BufferGeometry } from 'three';
import type { Point } from '../../../ids';
import { BUSBAR } from './gridConstants';
import { strut, slab } from './geometry';
import { radialAroundX, withLateral } from './widening';

const ROUND_SEGMENTS = 10;
const QUARTER_TURN = Math.PI / 2;
const KNEE_M = 3.2;

export const TRANSFORMER = {
  plinth: [14, 0.7, 9.5] as Point,
  body: [11.5, 7.6, 6.6] as Point,
  fins: 8,
  fin: [3, 5.8, 0.22] as Point,
  finPitch: 0.82,
  bushings: 3,
  bushingRadius: 0.3,
  bushingHeight: 3.3,
  conservatorRadius: 0.8,
  conservatorLength: 4.6,
} as const;

export const GANTRY = {
  height: 15,
  column: 0.8,
  beam: 0.65,
  brace: 0.3,
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
  const bar = new CylinderGeometry(BUSBAR.radius, BUSBAR.radius, toX - fromX, ROUND_SEGMENTS);
  return withLateral(bar.rotateZ(QUARTER_TURN), radialAroundX(0)).translate(
    (fromX + toX) / 2,
    y,
    z,
  );
}
