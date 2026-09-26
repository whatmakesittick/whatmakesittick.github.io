import { Group, Vector2 } from 'three';
import { HEAD, STRUCTURE } from '../constants';
import { fromLeftHalfXY, roundCorners } from '../geometry/profiles';
import type { SectionProfile } from '../geometry/profiles';
import { PROFILE_FRAME } from '../layout';
import { castingMesh } from './context';
import type { PartContext } from './context';

const INNER_CORNER_RADIUS = 10;

function outerPoints(): Vector2[] {
  return [
    new Vector2(0, HEAD.coverTop),
    new Vector2(-HEAD.halfWidth, HEAD.coverTop),
    new Vector2(-HEAD.halfWidth, HEAD.deckHeight),
  ];
}

function shellProfile(): SectionProfile {
  const innerX = -HEAD.halfWidth + HEAD.coverWall;
  const innerTop = HEAD.coverTop - HEAD.coverWall;
  const points = [
    ...outerPoints(),
    new Vector2(innerX, HEAD.deckHeight),
    new Vector2(innerX, innerTop),
    new Vector2(0, innerTop),
  ];
  const radii = new Map([
    [1, HEAD.coverCornerRadius],
    [4, INNER_CORNER_RADIUS],
  ]);
  return { boundary: fromLeftHalfXY(roundCorners(points, radii)), openings: [] };
}

function wallProfile(): SectionProfile {
  const points = [...outerPoints(), new Vector2(0, HEAD.deckHeight)];
  return {
    boundary: fromLeftHalfXY(roundCorners(points, new Map([[1, HEAD.coverCornerRadius]]))),
    openings: [],
  };
}

export function createCamCover(context: PartContext): Group {
  const group = new Group();
  const length = context.layout.halfLength;
  const wall = STRUCTURE.wall;
  const pieces = [
    castingMesh(context, shellProfile(), PROFILE_FRAME, -length + wall, length - wall),
    castingMesh(context, wallProfile(), PROFILE_FRAME, -length, -length + wall),
    castingMesh(context, wallProfile(), PROFILE_FRAME, length - wall, length),
  ];
  pieces.forEach((mesh) => mesh && group.add(mesh));
  return group;
}
