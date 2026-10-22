import type { BufferGeometry } from 'three';
import { BEAM_M, SIDE_SIGNS } from '../../../model';
import { CANTILEVER, DECK, PACKS, RAIL } from './constants';
import { around, boxOver, evenlySpaced, extrudeSide, mergeParts, sideSpan } from './geometry';
import type { ProfilePoint } from './geometry';
import { CANTILEVER_PROFILE, GUSSET_PROFILE, RAIL_PROFILE, STRIP_PROFILE } from './profiles';

export const HALF_RUN = BEAM_M / 2 - DECK.joint / 2;

function bothSides(points: readonly ProfilePoint[]): BufferGeometry {
  return mergeParts(SIDE_SIGNS.map((side) => extrudeSide(points, side, -HALF_RUN, HALF_RUN)));
}

export function packCentres(): number[] {
  const run = PACKS.perBeam * PACKS.pitch;
  return evenlySpaced(PACKS.perBeam, -run / 2, run / 2);
}

function gussetParts(x: number, side: number): BufferGeometry[] {
  return [
    extrudeSide(GUSSET_PROFILE, side, ...around(x, CANTILEVER.gussetThickness)),
    boxOver(
      around(x, RAIL.hangerWidth),
      [RAIL.top, CANTILEVER.underside],
      sideSpan(side, RAIL.inner, RAIL.outer),
    ),
  ];
}

function gussetPositions(): number[] {
  const count = Math.floor(BEAM_M / CANTILEVER.gussetSpacing);
  return evenlySpaced(count, -BEAM_M / 2, BEAM_M / 2);
}

export function cantileverModule(detailed: boolean): BufferGeometry {
  const gussets = detailed ? gussetPositions() : [];
  return mergeParts(
    SIDE_SIGNS.flatMap((side) => [
      extrudeSide(CANTILEVER_PROFILE, side, -HALF_RUN, HALF_RUN),
      ...gussets.flatMap((x) => gussetParts(x, side)),
    ]),
  );
}

export function stripModule(): BufferGeometry {
  return bothSides(STRIP_PROFILE);
}

export function railModule(): BufferGeometry {
  return bothSides(RAIL_PROFILE);
}
