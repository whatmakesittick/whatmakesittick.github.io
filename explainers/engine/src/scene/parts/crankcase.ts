import { Group, Vector2 } from 'three';
import { BLOCK, CRANK, CRANKCASE, STRUCTURE } from '../constants';
import { fromLeftHalfXY, roundCorners } from '../geometry/profiles';
import type { SectionProfile } from '../geometry/profiles';
import { PROFILE_FRAME } from '../layout';
import { castingMesh } from './context';
import type { PartContext } from './context';

const INNER_CORNER_RADIUS = 6;

interface Outline {
  outerTop: Vector2;
  outerShoulder: Vector2;
  outerBottom: Vector2;
}

function outline(): Outline {
  return {
    outerTop: new Vector2(-BLOCK.halfWidth, BLOCK.bottom),
    outerShoulder: new Vector2(-CRANKCASE.outerHalfWidth, CRANKCASE.shoulderHeight),
    outerBottom: new Vector2(-CRANKCASE.outerHalfWidth, CRANKCASE.bottom),
  };
}

function insetSlant({ outerTop, outerShoulder }: Outline): { top: Vector2; shoulder: Vector2 } {
  const direction = outerShoulder.clone().sub(outerTop).normalize();
  const inward = new Vector2(-direction.y, direction.x);
  const origin = outerTop.clone().addScaledVector(inward, STRUCTURE.wall);
  const innerWallX = -CRANKCASE.outerHalfWidth + STRUCTURE.wall;
  const toTop = (BLOCK.bottom - origin.y) / direction.y;
  const toShoulder = (innerWallX - origin.x) / direction.x;
  return {
    top: origin.clone().addScaledVector(direction, toTop),
    shoulder: origin.clone().addScaledVector(direction, toShoulder),
  };
}

function shellProfile(): SectionProfile {
  const shape = outline();
  const inner = insetSlant(shape);
  const innerBottomY = CRANKCASE.bottom + STRUCTURE.wall;
  const points = [
    new Vector2(0, CRANKCASE.bottom),
    shape.outerBottom,
    shape.outerShoulder,
    shape.outerTop,
    inner.top,
    inner.shoulder,
    new Vector2(inner.shoulder.x, innerBottomY),
    new Vector2(0, innerBottomY),
  ];
  const radii = new Map([
    [1, CRANKCASE.cornerRadius],
    [6, INNER_CORNER_RADIUS],
  ]);
  return { boundary: fromLeftHalfXY(roundCorners(points, radii)), openings: [] };
}

function wallProfile(): SectionProfile {
  const shape = outline();
  const points = [
    new Vector2(0, BLOCK.bottom),
    shape.outerTop,
    shape.outerShoulder,
    shape.outerBottom,
    new Vector2(0, CRANKCASE.bottom),
  ];
  return {
    boundary: fromLeftHalfXY(roundCorners(points, new Map([[3, CRANKCASE.cornerRadius]]))),
    openings: [{ center: 0, radius: CRANK.mainJournalRadius + CRANKCASE.frontJournalClearance }],
  };
}

export function createCrankcase(context: PartContext): Group {
  const group = new Group();
  const front = context.layout.halfLength;
  const pieces = [
    castingMesh(context, shellProfile(), PROFILE_FRAME, -front, front - STRUCTURE.wall),
    castingMesh(context, wallProfile(), PROFILE_FRAME, front - STRUCTURE.wall, front),
  ];
  pieces.forEach((mesh) => mesh && group.add(mesh));
  return group;
}
