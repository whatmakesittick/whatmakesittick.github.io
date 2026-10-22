import { Path, Vector2 } from 'three';
import type { Shape } from 'three';
import { CANTILEVER, DECK, PACKS, RAIL, STRIP, TRAY } from './constants';
import { mirrored, profileShape } from './geometry';
import type { ProfilePoint } from './geometry';

export const GIRDER_HALF: readonly ProfilePoint[] = [
  [0, DECK.top],
  [DECK.concreteEdge, DECK.top],
  [DECK.concreteEdge, DECK.flangeUnderside],
  [DECK.haunch.z, DECK.haunch.y],
  [DECK.webFoot.z, DECK.webFoot.y],
  [DECK.bottomHalf, DECK.bottom],
  [0, DECK.bottom],
];

export const VOID_HALF: readonly ProfilePoint[] = [
  [0, DECK.voidTop],
  [DECK.voidTopHalf, DECK.voidTop],
  [DECK.voidTopHalf + DECK.voidHaunch, DECK.voidTop - DECK.voidHaunch],
  [DECK.voidFoot.z, DECK.voidFoot.y],
  [DECK.voidFoot.z - DECK.voidHaunch, DECK.voidBottom],
  [0, DECK.voidBottom],
];

export const CANTILEVER_PROFILE: readonly ProfilePoint[] = [
  [DECK.concreteEdge, DECK.top],
  [DECK.edge - CANTILEVER.topChamfer, DECK.top],
  [DECK.edge, DECK.top - CANTILEVER.topChamfer],
  [DECK.edge, CANTILEVER.underside],
  [CANTILEVER.innerFoot, CANTILEVER.underside],
  [DECK.concreteEdge, DECK.flangeUnderside],
];

export const GUSSET_PROFILE: readonly ProfilePoint[] = [
  [CANTILEVER.innerFoot, CANTILEVER.underside],
  [DECK.concreteEdge, DECK.flangeUnderside],
  [CANTILEVER.gussetFoot.z, CANTILEVER.gussetFoot.y],
];

export const RAIL_PROFILE: readonly ProfilePoint[] = [
  [RAIL.inner, RAIL.top],
  [RAIL.outer - RAIL.chamfer, RAIL.top],
  [RAIL.outer, RAIL.top - RAIL.chamfer],
  [RAIL.outer, RAIL.bottom + RAIL.chamfer],
  [RAIL.outer - RAIL.chamfer, RAIL.bottom],
  [RAIL.inner, RAIL.bottom],
];

export const TRAY_PROFILE: readonly ProfilePoint[] = [
  [TRAY.inner, TRAY.top],
  [TRAY.inner, TRAY.bottom],
  [TRAY.outer, TRAY.bottom],
  [TRAY.outer, TRAY.top],
  [TRAY.outer - TRAY.wall, TRAY.top],
  [TRAY.outer - TRAY.wall, TRAY.bottom + TRAY.wall],
  [TRAY.inner + TRAY.wall, TRAY.bottom + TRAY.wall],
  [TRAY.inner + TRAY.wall, TRAY.top],
];

function rectangle(inner: number, outer: number, bottom: number, top: number): ProfilePoint[] {
  return [
    [inner, bottom],
    [outer, bottom],
    [outer, top],
    [inner, top],
  ];
}

export const PACK_PROFILE = rectangle(PACKS.inner, PACKS.outer, PACKS.bottom, PACKS.top);

export const STRIP_PROFILE = rectangle(
  STRIP.z - STRIP.width / 2,
  STRIP.z + STRIP.width / 2,
  DECK.top + STRIP.proud - STRIP.thickness,
  DECK.top + STRIP.proud,
);

export function girderShape(): Shape {
  const shape = profileShape(mirrored(GIRDER_HALF));
  shape.holes.push(new Path(mirrored(VOID_HALF).map(([z, y]) => new Vector2(z, y))));
  return shape;
}
