import { Group } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { lerp, toRadians } from '@core/math';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { HOOK } from '../../model';
import { HOOK_BODY, LOWER_SHAFT } from '../constants';
import { extrudePlan } from '../geometry/extrude';
import { box, cylinderAlongX, verticalCylinder } from '../geometry/primitives';
import { aroundHook, hookSectorPoints, planShape } from '../geometry/shapes';
import { anchorAt, partMesh } from './context';
import type { PartContext } from './context';

export interface HookPart {
  object: Group;
  labelAnchor: Object3D;
  setAngles(hookDegrees: number, shaftDegrees: number): void;
}

const HORN_STEPS = 10;
const HORN_OUTER_EASE = 0.6;
const TOOTH_WIDTH_SHARE = 0.5;
const FULL_TURN = 360;
const LABEL_HOOK_ANGLE = -30;

function wallGeometry(): BufferGeometry {
  const { wallInner, wallOuter, wallBottom, wallTop, hornSweep, wallSweep, arcSteps } = HOOK_BODY;
  const points = hookSectorPoints(
    -hornSweep - wallSweep,
    -hornSweep,
    wallInner,
    wallOuter,
    arcSteps,
  );
  return extrudePlan(planShape(points), wallBottom, wallTop);
}

function hornGeometry(): BufferGeometry {
  const { wallInner, wallOuter, hornSweep, hornHeight, hornThickness, tipRadius } = HOOK_BODY;
  const share = (index: number) => index / HORN_STEPS;
  const angle = (index: number) => -hornSweep * (1 - share(index));
  const outer = Array.from({ length: HORN_STEPS + 1 }, (_, index) =>
    aroundHook(angle(index), lerp(wallOuter, tipRadius, share(index) ** HORN_OUTER_EASE)),
  );
  const inner = Array.from({ length: HORN_STEPS }, (_, step) => {
    const index = HORN_STEPS - 1 - step;
    return aroundHook(angle(index), lerp(wallInner, tipRadius, share(index)));
  });
  return extrudePlan(
    planShape([...outer, ...inner]),
    hornHeight - hornThickness / 2,
    hornHeight + hornThickness / 2,
  );
}

function gearTeeth(
  radius: number,
  depth: number,
  count: number,
  bottom: number,
  top: number,
): BufferGeometry[] {
  const width = ((2 * Math.PI * radius) / count) * TOOTH_WIDTH_SHARE;
  return Array.from({ length: count }, (_, index) => {
    const tooth = box({
      minX: -width / 2,
      maxX: width / 2,
      minY: bottom,
      maxY: top,
      minZ: radius - depth,
      maxZ: radius,
    });
    tooth.rotateY(toRadians((FULL_TURN * index) / count));
    return tooth;
  });
}

function gearGeometry(radius: number, teeth: number, bottom: number, top: number): BufferGeometry {
  const depth = HOOK_BODY.toothDepth;
  const parts = [
    verticalCylinder(radius - depth, bottom, top),
    ...gearTeeth(radius, depth * 2, teeth, bottom, top),
  ];
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return merged;
}

function bodyGeometries(): BufferGeometry[] {
  const { wallOuter, wallBottom, baseThickness, shaftRadius, gearTop, gearBottom, gearRadius } =
    HOOK_BODY;
  return [
    verticalCylinder(wallOuter, wallBottom - baseThickness, wallBottom),
    wallGeometry(),
    verticalCylinder(shaftRadius, gearBottom, wallBottom - baseThickness),
    gearGeometry(gearRadius, HOOK_BODY.gearTeeth, gearBottom, gearTop),
  ];
}

function lowerShaftGeometries(): BufferGeometry[] {
  const { radius, left, right, gearRadius, gearHalfWidth, gearTeeth, gearX } = LOWER_SHAFT;
  const gear = gearGeometry(gearRadius, gearTeeth, -gearHalfWidth, gearHalfWidth);
  gear.rotateZ(-Math.PI / 2);
  gear.translate(gearX, 0, 0);
  return [cylinderAlongX(radius, left, right), gear];
}

export function createHook(context: PartContext): HookPart {
  const object = new Group();
  object.position.z = HOOK.axisOffset;
  const spin = new Group();
  bodyGeometries().forEach((geometry) =>
    spin.add(partMesh(context, geometry, 'hook', 'hookSteel')),
  );
  spin.add(partMesh(context, hornGeometry(), 'hook', 'paint'));
  const lowerShaft = new Group();
  lowerShaft.position.y = LOWER_SHAFT.y;
  lowerShaftGeometries().forEach((geometry) =>
    lowerShaft.add(partMesh(context, geometry, STRUCTURE_GROUP, 'darkSteel')),
  );
  object.add(spin, lowerShaft);
  const labelSpot = aroundHook(LABEL_HOOK_ANGLE, HOOK_BODY.wallInner);
  const labelAnchor = anchorAt(object, labelSpot.x, HOOK_BODY.hornHeight, labelSpot.z);
  return {
    object,
    labelAnchor,
    setAngles: (hookDegrees, shaftDegrees) => {
      spin.rotation.y = toRadians(hookDegrees);
      lowerShaft.rotation.x = toRadians(shaftDegrees);
    },
  };
}
