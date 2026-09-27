import { Group, Shape, Vector2 } from 'three';
import type { Mesh } from 'three';
import { toRadians } from '@core/math';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import {
  ARM,
  BASE,
  BED,
  DIAL,
  FACE_PLATE,
  FREE_ARM,
  HEAD,
  PILLAR,
  PLATE,
  WINDOW,
} from '../constants';
import { extrudePlan, extrudeProfileAlongX } from '../geometry/extrude';
import { box, cylinderAlongZ } from '../geometry/primitives';
import { roundedRectShape } from '../geometry/shapes';
import { partMesh } from './context';
import type { PartContext } from './context';

export interface BodyPart {
  object: Group;
  setCutaway(cutaway: boolean): void;
}

const CORNER_STEPS = 6;
const BED_BOTTOM = -BED.height;
const QUARTER = 90;

function cornerPoints(
  centerA: number,
  centerB: number,
  radius: number,
  fromDegrees: number,
  toDegrees: number,
): Vector2[] {
  return Array.from({ length: CORNER_STEPS + 1 }, (_, index) => {
    const angle = toRadians(fromDegrees + ((toDegrees - fromDegrees) * index) / CORNER_STEPS);
    return new Vector2(centerA + radius * Math.cos(angle), centerB + radius * Math.sin(angle));
  });
}

function freeArmProfile(): Shape {
  const half = FREE_ARM.halfDepth;
  return roundedRectShape(
    { minA: -half, minB: BED_BOTTOM, maxA: half, maxB: BED.top },
    BED.cornerRadius,
  );
}

function shellProfile(side: number): Shape {
  const r = BED.cornerRadius;
  const outer = FREE_ARM.halfDepth;
  const inner = outer - WINDOW.shell;
  const edge = outer - r;
  const points = [
    ...cornerPoints(edge, BED.top - r, r, QUARTER, 0),
    ...cornerPoints(edge, BED_BOTTOM + r, r, 0, -QUARTER),
    new Vector2(edge, BED_BOTTOM + WINDOW.shell),
    new Vector2(inner, BED_BOTTOM + WINDOW.shell),
    new Vector2(inner, BED.top - WINDOW.rim),
    new Vector2(edge, BED.top - WINDOW.rim),
  ];
  return new Shape(points.map((point) => new Vector2(point.x * side, point.y)));
}

function windowPieces(context: PartContext): { fixed: Mesh[]; front: Mesh } {
  const front = partMesh(
    context,
    extrudeProfileAlongX(shellProfile(1), WINDOW.left, WINDOW.right),
    STRUCTURE_GROUP,
    'bedEnamel',
  );
  const back = partMesh(
    context,
    extrudeProfileAlongX(shellProfile(-1), WINDOW.left, WINDOW.right),
    STRUCTURE_GROUP,
    'bedEnamel',
  );
  const floorEdge = FREE_ARM.halfDepth - BED.cornerRadius;
  const floor = box({
    minX: WINDOW.left,
    maxX: WINDOW.right,
    minY: BED_BOTTOM,
    maxY: BED_BOTTOM + WINDOW.shell,
    minZ: -floorEdge,
    maxZ: floorEdge,
  });
  const rim = (minX: number, maxX: number) =>
    box({
      minX,
      maxX,
      minY: BED.top - WINDOW.rim,
      maxY: BED.top,
      minZ: PLATE.back,
      maxZ: PLATE.front,
    });
  return {
    front,
    fixed: [
      back,
      partMesh(context, floor, STRUCTURE_GROUP, 'bedEnamel'),
      partMesh(context, rim(WINDOW.left, PLATE.left), STRUCTURE_GROUP, 'bedEnamel'),
      partMesh(context, rim(PLATE.right, WINDOW.right), STRUCTURE_GROUP, 'bedEnamel'),
    ],
  };
}

function bedPieces(context: PartContext): Mesh[] {
  const profile = freeArmProfile();
  const base = roundedRectShape(
    { minA: BASE.left, minB: -BASE.halfDepth, maxA: BASE.right, maxB: BASE.halfDepth },
    BASE.cornerRadius,
  );
  return [
    extrudeProfileAlongX(profile, FREE_ARM.left, WINDOW.left),
    extrudeProfileAlongX(profile, WINDOW.right, FREE_ARM.right),
    extrudePlan(base, BED_BOTTOM, BED.top),
  ].map((geometry) => partMesh(context, geometry, STRUCTURE_GROUP, 'bedEnamel'));
}

function upperPieces(context: PartContext): Mesh[] {
  const pillar = roundedRectShape(
    { minA: PILLAR.left, minB: PILLAR.back, maxA: PILLAR.right, maxB: PILLAR.front },
    PILLAR.cornerRadius,
  );
  const arm = roundedRectShape(
    { minA: ARM.back, minB: ARM.bottom, maxA: ARM.front, maxB: ARM.top },
    ARM.cornerRadius,
  );
  const head = roundedRectShape(
    { minA: HEAD.left, minB: HEAD.back, maxA: HEAD.right, maxB: HEAD.front },
    HEAD.cornerRadius,
  );
  return [
    extrudePlan(pillar, BED.top, PILLAR.top),
    extrudeProfileAlongX(arm, ARM.left, ARM.right),
    extrudePlan(head, HEAD.bottom, HEAD.top),
  ].map((geometry) => partMesh(context, geometry, STRUCTURE_GROUP, 'enamel'));
}

function trimPieces(context: PartContext): Mesh[] {
  const { inset, thickness, margin } = FACE_PLATE;
  const face = roundedRectShape(
    {
      minA: HEAD.back + margin,
      minB: HEAD.bottom + margin,
      maxA: HEAD.front - margin,
      maxB: HEAD.top - margin,
    },
    HEAD.cornerRadius,
  );
  const faceStart = HEAD.left - thickness;
  const dialFront = PILLAR.front + DIAL.depth;
  const pointer = box({
    minX: DIAL.x - DIAL.pointerHalfWidth,
    maxX: DIAL.x + DIAL.pointerHalfWidth,
    minY: DIAL.y,
    maxY: DIAL.y + DIAL.pointerLength,
    minZ: dialFront,
    maxZ: dialFront + DIAL.pointerDepth,
  });
  const dial = cylinderAlongZ(DIAL.radius, PILLAR.front, dialFront);
  dial.translate(DIAL.x, DIAL.y, 0);
  return [
    partMesh(
      context,
      extrudeProfileAlongX(face, faceStart, HEAD.left + inset),
      STRUCTURE_GROUP,
      'chrome',
    ),
    partMesh(context, dial, STRUCTURE_GROUP, 'trim'),
    partMesh(context, pointer, STRUCTURE_GROUP, 'paint'),
  ];
}

export function createBody(context: PartContext): BodyPart {
  const object = new Group();
  const window = windowPieces(context);
  object.add(
    ...bedPieces(context),
    ...window.fixed,
    window.front,
    ...upperPieces(context),
    ...trimPieces(context),
  );
  return {
    object,
    setCutaway: (cutaway) => {
      window.front.visible = !cutaway;
    },
  };
}
