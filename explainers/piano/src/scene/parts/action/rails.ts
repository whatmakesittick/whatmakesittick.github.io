import type { BufferGeometry, Object3D } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { CASE, DAMPER_TOP_KEY, keyX } from '../../../model';
import { namedGroup, partMesh } from '../context';
import type { PartContext } from '../context';
import { boxBetween, mergeParts, profileAlongX, roundedShape } from '../keyboard/geometry';
import type { Outline, Rect } from '../keyboard/geometry';
import { FRAME_HALF_WIDTH } from '../keyboard/layout';
import {
  DAMPER_GUIDE_RAIL,
  DAMPER_LEVER_RAIL,
  HAMMER_RAIL,
  REGULATING_RAIL,
  WIPPEN_RAIL,
} from './dimensions';
import { ACTION_FINISHES } from './finishes';

export const ACTION_RAILS: readonly Rect[] = [HAMMER_RAIL, REGULATING_RAIL, WIPPEN_RAIL];
export const DAMPER_RAILS: readonly Rect[] = [DAMPER_GUIDE_RAIL, DAMPER_LEVER_RAIL];

const DAMPER_RAIL_MARGIN = 0.015;
export const DAMPER_RAIL_SPAN = [
  keyX(1) - DAMPER_RAIL_MARGIN,
  keyX(DAMPER_TOP_KEY) + DAMPER_RAIL_MARGIN,
] as const;

const BRACKET = { inner: 0.607, outer: FRAME_HALF_WIDTH + 0.0005, round: 0.006 } as const;
const BRACKET_PROFILE: Outline = [
  [-0.255, CASE.keybedY],
  [-0.44, CASE.keybedY],
  [-0.44, 0.69],
  [-0.414, 0.728],
  [-0.412, 0.75],
  [-0.33, 0.8],
  [-0.324, 0.828],
  [-0.268, 0.828],
  [-0.257, 0.79],
  [-0.255, 0.74],
];

function railBox({ a, b }: Rect, minX: number, maxX: number): BufferGeometry {
  return boxBetween({ minX, maxX, minY: b[0], maxY: b[1], minZ: a[0], maxZ: a[1] });
}

function brackets(): BufferGeometry {
  const shape = roundedShape(BRACKET_PROFILE, BRACKET.round);
  return mergeParts([
    profileAlongX(shape, BRACKET.inner, BRACKET.outer),
    profileAlongX(shape, -BRACKET.outer, -BRACKET.inner),
  ]);
}

export function buildActionRails(context: PartContext): Object3D {
  const group = namedGroup('actionRails');
  const rails = mergeParts(
    ACTION_RAILS.map((rect) => railBox(rect, -FRAME_HALF_WIDTH, FRAME_HALF_WIDTH)),
  );
  group.add(partMesh(context, rails, STRUCTURE_GROUP, ACTION_FINISHES.rail));
  group.add(partMesh(context, brackets(), STRUCTURE_GROUP, ACTION_FINISHES.bracket));
  return group;
}

export function buildDamperRails(context: PartContext): Object3D {
  const [minX, maxX] = DAMPER_RAIL_SPAN;
  const rails = mergeParts(DAMPER_RAILS.map((rect) => railBox(rect, minX, maxX)));
  return partMesh(context, rails, STRUCTURE_GROUP, ACTION_FINISHES.rail);
}

export function cutsDamperRails(x: number): boolean {
  return x > DAMPER_RAIL_SPAN[0] && x < DAMPER_RAIL_SPAN[1];
}
