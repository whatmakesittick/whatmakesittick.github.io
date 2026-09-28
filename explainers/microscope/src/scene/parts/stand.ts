import { Group, Shape, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import { box } from '@core/scene/geometry/box';
import { extrudePlan, extrudeProfileAlongX, roundedRectShape } from '@core/scene/geometry/extrude';
import { STRUCTURE_GROUP, UNDIMMED_GROUP } from '@core/scene/materials';
import { ARM, BASE, BASE_TOP, BENCH_LEVEL, BENCH_MAT, HEAD } from '../constants';
import { partMesh } from './context';
import type { PartContext } from './context';

export interface StandPart {
  object: Group;
  setCutaway(cutaway: boolean): void;
}

function baseGeometry(): BufferGeometry {
  const { halfWidth, back, front, cornerRadius } = BASE;
  const outline = roundedRectShape(
    { minA: -halfWidth, minB: back, maxA: halfWidth, maxB: front },
    cornerRadius,
  );
  return extrudePlan(outline, BENCH_LEVEL, BASE_TOP);
}

function matGeometry(): BufferGeometry {
  const { halfWidth, back, front, thickness } = BENCH_MAT;
  return box({
    minX: -halfWidth,
    maxX: halfWidth,
    minY: BENCH_LEVEL - thickness,
    maxY: BENCH_LEVEL,
    minZ: back,
    maxZ: front,
  });
}

function armGeometry(): BufferGeometry {
  const profile = new Shape(ARM.outline.map(([z, y]) => new Vector2(z, y)));
  return extrudeProfileAlongX(profile, -ARM.halfWidth, ARM.halfWidth);
}

function headGeometry(right: number): BufferGeometry {
  return box({
    minX: -HEAD.halfWidth,
    maxX: right,
    minY: HEAD.bottom,
    maxY: HEAD.top,
    minZ: HEAD.back,
    maxZ: HEAD.front,
  });
}

export function createStand(context: PartContext): StandPart {
  const headWhole = partMesh(context, headGeometry(HEAD.halfWidth), STRUCTURE_GROUP, 'enamel');
  const headBack = partMesh(context, headGeometry(-HEAD.cutGap), STRUCTURE_GROUP, 'enamel');
  const object = new Group();
  object.add(
    partMesh(context, matGeometry(), UNDIMMED_GROUP, 'mat'),
    partMesh(context, baseGeometry(), STRUCTURE_GROUP, 'enamel'),
    partMesh(context, armGeometry(), STRUCTURE_GROUP, 'enamel'),
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
