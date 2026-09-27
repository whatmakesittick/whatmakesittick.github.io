import { Group } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { extrudePlan, planHole, planShape } from '@core/scene/geometry/extrude';
import { anchorAt } from '@core/scene/parts';
import { BOBBIN_CASE, HOOK } from '../../model';
import { BOBBIN_SHAPE, CASE_SHAPE } from '../constants';
import { verticalCylinder } from '../geometry/primitives';
import { circlePoints, hookSectorPoints } from '../geometry/shapes';
import { partMesh } from './context';
import type { PartContext } from './context';

export interface BobbinPart {
  object: Group;
  caseAnchor: Object3D;
  bobbinAnchor: Object3D;
}

const CIRCLE_STEPS = 32;
const CASE_LABEL_DIAGONAL = Math.SQRT1_2;
const CASE_LABEL_HEIGHT = -7.5;

function caseWall(): BufferGeometry {
  const shape = planShape(circlePoints(BOBBIN_CASE.radius, CIRCLE_STEPS));
  shape.holes.push(planHole(circlePoints(BOBBIN_CASE.radius - CASE_SHAPE.wall, CIRCLE_STEPS)));
  return extrudePlan(shape, BOBBIN_CASE.bottom, BOBBIN_CASE.top);
}

function caseSpring(): BufferGeometry {
  const { springFrom, springTo, springBottom, springTop, springThickness, arcSteps } = CASE_SHAPE;
  const points = hookSectorPoints(
    springFrom,
    springTo,
    BOBBIN_CASE.radius,
    BOBBIN_CASE.radius + springThickness,
    arcSteps,
  );
  return extrudePlan(planShape(points), springBottom, springTop);
}

function topFlange(): BufferGeometry {
  const { flangeRadius, flangeThickness, windowRadius, top } = BOBBIN_SHAPE;
  const shape = planShape(circlePoints(flangeRadius, CIRCLE_STEPS));
  shape.holes.push(planHole(circlePoints(windowRadius, CIRCLE_STEPS)));
  return extrudePlan(shape, top - flangeThickness, top);
}

function bobbinGeometries(): { flanges: BufferGeometry[]; wind: BufferGeometry } {
  const { flangeRadius, flangeThickness, coreRadius, windRadius, bottom, top } = BOBBIN_SHAPE;
  return {
    flanges: [
      verticalCylinder(flangeRadius, bottom, bottom + flangeThickness),
      topFlange(),
      verticalCylinder(coreRadius, bottom, top),
    ],
    wind: verticalCylinder(windRadius, bottom + flangeThickness, top - flangeThickness),
  };
}

export function createBobbin(context: PartContext): BobbinPart {
  const object = new Group();
  object.position.z = HOOK.axisOffset;
  const floor = verticalCylinder(
    BOBBIN_CASE.radius,
    BOBBIN_CASE.bottom,
    BOBBIN_CASE.bottom + CASE_SHAPE.floor,
  );
  object.add(
    partMesh(context, caseWall(), 'bobbinCase', 'darkSteel'),
    partMesh(context, floor, 'bobbinCase', 'darkSteel'),
    partMesh(context, caseSpring(), 'bobbinCase', 'chrome'),
  );
  const { flanges, wind } = bobbinGeometries();
  flanges.forEach((geometry) => object.add(partMesh(context, geometry, 'bobbin', 'plastic')));
  object.add(partMesh(context, wind, 'bobbin', 'bobbinThread'));
  const reach = BOBBIN_CASE.radius * CASE_LABEL_DIAGONAL;
  return {
    object,
    caseAnchor: anchorAt(object, reach, CASE_LABEL_HEIGHT, reach),
    bobbinAnchor: anchorAt(object, 0, BOBBIN_SHAPE.top, 0),
  };
}
