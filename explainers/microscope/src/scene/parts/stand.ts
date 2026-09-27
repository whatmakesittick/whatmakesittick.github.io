import { Group } from 'three';
import { STRUCTURE_GROUP, UNDIMMED_GROUP } from '@core/scene/materials';
import { ARM, BASE, BASE_TOP, BENCH_LEVEL, BENCH_MAT, HEAD } from '../constants';
import { boxBetween } from '../geometry/box';
import { extrudeAcrossX, extrudeUpward, outlineShape, roundedRectangle } from '../geometry/extrude';
import { partMesh } from './context';
import type { PartContext } from './context';

export interface StandPart {
  object: Group;
  setCutaway(cutaway: boolean): void;
}

export function createStand(context: PartContext): StandPart {
  const base = extrudeUpward(
    roundedRectangle([-BASE.halfWidth, BASE.back], [BASE.halfWidth, BASE.front], BASE.cornerRadius),
    BENCH_LEVEL,
    BASE_TOP,
  );
  const mat = boxBetween(
    [-BENCH_MAT.halfWidth, BENCH_LEVEL - BENCH_MAT.thickness, BENCH_MAT.back],
    [BENCH_MAT.halfWidth, BENCH_LEVEL, BENCH_MAT.front],
  );
  const arm = extrudeAcrossX(outlineShape(ARM.outline), ARM.halfWidth);
  const headWhole = partMesh(
    context,
    boxBetween([-HEAD.halfWidth, HEAD.bottom, HEAD.back], [HEAD.halfWidth, HEAD.top, HEAD.front]),
    STRUCTURE_GROUP,
    'enamel',
  );
  const headBack = partMesh(
    context,
    boxBetween([-HEAD.halfWidth, HEAD.bottom, HEAD.back], [-HEAD.cutGap, HEAD.top, HEAD.front]),
    STRUCTURE_GROUP,
    'enamel',
  );
  const object = new Group();
  object.add(
    partMesh(context, mat, UNDIMMED_GROUP, 'mat'),
    partMesh(context, base, STRUCTURE_GROUP, 'enamel'),
    partMesh(context, arm, STRUCTURE_GROUP, 'enamel'),
    headWhole,
    headBack,
  );
  return {
    object,
    setCutaway: (cutaway) => {
      headWhole.visible = !cutaway;
      headBack.visible = cutaway;
    },
  };
}
