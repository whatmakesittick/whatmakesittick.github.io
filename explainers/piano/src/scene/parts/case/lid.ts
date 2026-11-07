import { Group } from 'three';
import type { BufferGeometry } from 'three';
import { toRadians } from '@core/math';
import { box } from '@core/scene/geometry/box';
import { extrudePlan, planShape } from '@core/scene/geometry/extrude';
import type { Point } from '../../../ids';
import { CASE, LID } from '../../../model';
import { FINISHES } from '../../finishes';
import { CASE_OUTLINE, insetOutline } from '../../geometry/outline';
import { partMesh } from '../context';
import type { PartContext } from '../context';
import { clipBehind, mergeParts, rod } from './geometry';
import { GLOSS } from './gloss';
import { RIM_OUTLINE } from './shell';

const OVERHANG = 0.012;
const FLAP_DEPTH = 0.27;
const HINGE = { radius: 0.007, length: 0.09, spots: [-0.55, -1.35, -2.1], segments: 10 } as const;
const FLAP_HINGE_RADIUS = 0.004;
const PROP = { z: -1.0, lidReach: 1.2, radius: 0.012, topRadius: 0.009, segments: 12 } as const;
const PROP_CUP = { radius: 0.02, height: 0.018 } as const;
const BENTSIDE_SIDE = 0;

function lidBoards(): BufferGeometry[] {
  const outline = insetOutline(CASE_OUTLINE, -OVERHANG).map(({ x, z }) => ({
    x: x - CASE.leftX,
    z,
  }));
  const main = extrudePlan(planShape(clipBehind(outline, -FLAP_DEPTH)), 0, LID.thickness);
  const width = CASE.width + 2 * OVERHANG;
  const flap = box({
    minX: -OVERHANG,
    maxX: width - OVERHANG,
    minY: LID.thickness,
    maxY: 2 * LID.thickness,
    minZ: -2 * FLAP_DEPTH - OVERHANG,
    maxZ: -FLAP_DEPTH,
  });
  return [main, flap];
}

function lidHinges(): BufferGeometry {
  const width = CASE.width + 2 * OVERHANG;
  return mergeParts([
    ...HINGE.spots.map((z) =>
      rod({
        from: [0, 0, z + HINGE.length / 2],
        to: [0, 0, z - HINGE.length / 2],
        radius: HINGE.radius,
        segments: HINGE.segments,
      }),
    ),
    rod({
      from: [-OVERHANG, LID.thickness, -FLAP_DEPTH],
      to: [width - OVERHANG, LID.thickness, -FLAP_DEPTH],
      radius: FLAP_HINGE_RADIUS,
      segments: HINGE.segments,
    }),
  ]);
}

function lidPoint(reach: number, z: number): Point {
  const angle = toRadians(LID.angleDeg);
  return [CASE.leftX + reach * Math.cos(angle), CASE.rimTop + reach * Math.sin(angle), z];
}

function rimMiddleAt(z: number): Point {
  const middle = insetOutline(RIM_OUTLINE, CASE.rimThickness / 2).filter(
    ({ x }) => x > BENTSIDE_SIDE,
  );
  const nearest = middle.reduce((best, point) =>
    Math.abs(point.z - z) < Math.abs(best.z - z) ? point : best,
  );
  return [nearest.x, CASE.rimTop, nearest.z];
}

function prop(): BufferGeometry {
  const base = rimMiddleAt(PROP.z);
  const top = lidPoint(PROP.lidReach, base[2]);
  return mergeParts([
    rod({
      from: base,
      to: top,
      radius: PROP.radius,
      topRadius: PROP.topRadius,
      segments: PROP.segments,
    }),
    rod({
      from: base,
      to: [base[0], base[1] + PROP_CUP.height, base[2]],
      radius: PROP_CUP.radius,
      segments: PROP.segments,
    }),
  ]);
}

export function buildLid(context: PartContext): Group {
  const lid = new Group();
  lid.name = 'lid';
  lid.position.set(CASE.leftX, CASE.rimTop, CASE.frontZ);
  lid.rotation.z = toRadians(LID.angleDeg);
  lid.add(
    partMesh(context, mergeParts(lidBoards()), 'case', GLOSS.case),
    partMesh(context, lidHinges(), 'case', FINISHES.brass),
  );
  const group = new Group();
  group.add(lid, partMesh(context, prop(), 'case', GLOSS.case));
  return group;
}
