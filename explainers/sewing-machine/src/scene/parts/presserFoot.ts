import { Group } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { toRadians } from '@core/math';
import { box } from '@core/scene/geometry/box';
import { extrudePlan, roundedRectHole, roundedRectShape } from '@core/scene/geometry/extrude';
import { anchorAt } from '@core/scene/parts';
import { HEAD, PRESSER } from '../constants';
import { cylinderAlongX, verticalCylinder } from '../geometry/primitives';
import { partMesh } from './context';
import type { PartContext } from './context';

export interface PresserFootPart {
  object: Group;
  labelAnchor: Object3D;
}

const BAR_OVERLAP = 12;
const SCREW_LENGTH = 4;
const SLOT_CORNER = 1;

function soleGeometry(): BufferGeometry {
  const { left, right, back, front, cornerRadius, slotHalfWidth, slotHalfLength } = PRESSER;
  const shape = roundedRectShape(
    { minA: left, minB: back, maxA: right, maxB: front },
    cornerRadius,
  );
  shape.holes.push(
    roundedRectHole(
      { minA: -slotHalfWidth, minB: -slotHalfLength, maxA: slotHalfWidth, maxB: slotHalfLength },
      SLOT_CORNER,
    ),
  );
  return extrudePlan(shape, PRESSER.soleBottom, PRESSER.soleBottom + PRESSER.soleThickness);
}

function toeGeometry(): BufferGeometry {
  const { left, right, front, toeLength, soleBottom, soleThickness, toeLiftDegrees } = PRESSER;
  const geometry = box({
    minX: left,
    maxX: right,
    minY: 0,
    maxY: soleThickness,
    minZ: 0,
    maxZ: toeLength,
  });
  geometry.rotateX(-toRadians(toeLiftDegrees));
  geometry.translate(0, soleBottom, front);
  return geometry;
}

function shankGeometries(): BufferGeometry[] {
  const { shank, soleBottom, soleThickness, barRadius, barZ, screwRadius } = PRESSER;
  const bottom = soleBottom + soleThickness;
  const bar = verticalCylinder(barRadius, shank.top, HEAD.bottom + BAR_OVERLAP);
  bar.translate(0, 0, barZ);
  const screw = cylinderAlongX(screwRadius, shank.right, shank.right + SCREW_LENGTH);
  screw.translate(0, (bottom + shank.top) / 2, (shank.back + shank.front) / 2);
  return [
    box({
      minX: shank.left,
      maxX: shank.right,
      minY: bottom,
      maxY: shank.top,
      minZ: shank.back,
      maxZ: shank.front,
    }),
    bar,
    screw,
  ];
}

export function createPresserFoot(context: PartContext): PresserFootPart {
  const object = new Group();
  object.add(
    partMesh(context, soleGeometry(), 'presserFoot', 'chrome'),
    partMesh(context, toeGeometry(), 'presserFoot', 'chrome'),
    ...shankGeometries().map((geometry) => partMesh(context, geometry, 'presserFoot', 'steel')),
  );
  const labelAnchor = anchorAt(
    object,
    PRESSER.right,
    PRESSER.soleBottom + PRESSER.soleThickness,
    PRESSER.front,
  );
  return { object, labelAnchor };
}
