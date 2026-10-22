import { Group, Shape, ShapeGeometry, Vector2 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { roundedRectShape } from '@core/scene/geometry/extrude';
import { CUT_X, GUIDANCE_RAIL, MAGNETS, STATOR, STATOR_BOTTOM } from '../../../model';
import { FINISHES } from '../../finishes';
import { finishMesh, partMesh } from '../context';
import type { PartContext } from '../context';
import { bodyOutline, cabinHalfWidth, cabinOutline } from './cabin';
import { CABIN, CUT_CAP, SKIRT } from './constants';
import { bevelledAlongX } from './extrude';
import { TRAIN_FINISHES } from './finishes';
import { buildInterior } from './interior';
import { mirroredPair } from './mirror';
import { armProfile } from './skirt';

const QUARTER_TURN = Math.PI / 2;
const CAP_CURVE_SEGMENTS = 4;
const SIDES = [1, -1] as const;

function facingAhead(points: readonly Vector2[]): Vector2[] {
  return points.map((point) => new Vector2(-point.x, point.y));
}

function capGeometry(shapes: Shape[], lift: number): BufferGeometry {
  const geometry = new ShapeGeometry(shapes, CAP_CURVE_SEGMENTS);
  geometry.rotateY(QUARTER_TURN);
  geometry.translate(CUT_X + lift, 0, 0);
  geometry.deleteAttribute('uv');
  return geometry;
}

function bodyCap(): Shape {
  const shape = new Shape(facingAhead(bodyOutline()));
  shape.holes.push(new Shape(facingAhead(cabinOutline())));
  return shape;
}

function armCaps(): Shape[] {
  const outline = armProfile(SKIRT.top).getPoints();
  return SIDES.map(
    (side) => new Shape(facingAhead(outline.map((point) => new Vector2(side * point.x, point.y)))),
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
  return mirroredPair(bevelledAlongX(armProfile(SKIRT.top), CUT_X - CUT_CAP.stubLength, CUT_X, 0));
}

export function buildCutaway(context: PartContext, parent: Object3D): Group {
  const group = new Group();
  group.name = 'trainCutaway';
  const face = finishMesh(
    context,
    capGeometry([bodyCap(), ...armCaps()], CUT_CAP.lift),
    'train',
    TRAIN_FINISHES.cutFace,
  );
  face.name = 'train';
  group.add(face);
  group.add(partMesh(context, armStub(), 'wrapArms'));
  const floor = finishMesh(
    context,
    capGeometry([floorPlate()], CUT_CAP.markerLift / 2),
    'train',
    FINISHES.underbody,
  );
  floor.name = 'train';
  group.add(floor);
  const markers = finishMesh(
    context,
    capGeometry(gapMarkerShapes(), CUT_CAP.markerLift),
    'train',
    TRAIN_FINISHES.marker,
  );
  markers.name = 'train';
  group.add(markers);
  buildInterior(context, group);
  group.visible = false;
  parent.add(group);
  return group;
}
