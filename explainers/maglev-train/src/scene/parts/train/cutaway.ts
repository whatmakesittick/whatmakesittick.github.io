import { Vector2 } from 'three';
import type { BufferGeometry, Group, Object3D, Shape } from 'three';
import { roundedRectShape } from '@core/scene/geometry/extrude';
import { CUT_X, GUIDANCE_RAIL, MAGNETS, STATOR, STATOR_BOTTOM } from '../../../model';
import { FINISHES } from '../../finishes';
import { namedGroup, partMesh } from '../context';
import type { PartContext } from '../context';
import { aheadShape, bodyOutline, cabinHalfWidth, cabinOutline, capGeometry } from './cabin';
import { CABIN, CUT_CAP, SKIRT } from './constants';
import { extrudeAlongX } from '../line/geometry';
import { CURVE_SEGMENTS } from './extrude';
import { TRAIN_FINISHES, trainMesh } from './finishes';
import { buildInterior } from './interior';
import { mirroredPair } from './mirror';
import { armProfile } from './skirt';

const SIDES = [1, -1] as const;

function bodyCap(): Shape {
  const shape = aheadShape(bodyOutline());
  shape.holes.push(aheadShape(cabinOutline()));
  return shape;
}

function armCaps(): Shape[] {
  const outline = armProfile(SKIRT.top).getPoints();
  return SIDES.map((side) =>
    aheadShape(outline.map((point) => new Vector2(side * point.x, point.y))),
  );
}

function marker(z: number, y: number, width: number, height: number): Shape {
  const radius = Math.min(width, height) / 2;
  return roundedRectShape(
    { minA: -z - width / 2, maxA: -z + width / 2, minB: y - height / 2, maxB: y + height / 2 },
    radius,
  );
}

export function gapMarkerShapes(): Shape[] {
  const supportGapY = (MAGNETS.support.top + STATOR_BOTTOM) / 2;
  const guidanceGapZ = (GUIDANCE_RAIL.faceZ + MAGNETS.guidance.faceZ) / 2;
  const { markerLength, markerThickness } = CUT_CAP;
  return SIDES.flatMap((side) => [
    marker(side * STATOR.sideZ, supportGapY, markerLength, markerThickness),
    marker(side * guidanceGapZ, MAGNETS.guidance.centreY, markerThickness, markerLength),
  ]);
}

function floorPlate(): Shape {
  const half = cabinHalfWidth(CABIN.floorY + CUT_CAP.floorPlate);
  return roundedRectShape(
    { minA: -half, maxA: half, minB: CABIN.floorY - CUT_CAP.floorPlate, maxB: CABIN.floorY },
    CUT_CAP.floorPlate / 2,
  );
}

function armStub(): BufferGeometry {
  return mirroredPair(
    extrudeAlongX(armProfile(SKIRT.top), CUT_X - CUT_CAP.stubLength, CUT_X, 0, CURVE_SEGMENTS),
  );
}

export function buildCutaway(context: PartContext, parent: Object3D): Group {
  const group = namedGroup('trainCutaway', parent);
  group.add(
    trainMesh(
      context,
      capGeometry([bodyCap(), ...armCaps()], CUT_X + CUT_CAP.lift),
      FINISHES.cutFace,
    ),
  );
  group.add(partMesh(context, armStub(), 'wrapArms'));
  group.add(
    trainMesh(
      context,
      capGeometry([floorPlate()], CUT_X + CUT_CAP.markerLift / 2),
      FINISHES.underbody,
    ),
  );
  group.add(
    trainMesh(
      context,
      capGeometry(gapMarkerShapes(), CUT_X + CUT_CAP.markerLift),
      TRAIN_FINISHES.marker,
    ),
  );
  buildInterior(context, group);
  group.visible = false;
  return group;
}
