import type { BufferGeometry } from 'three';
import { BEAM_M, SIDE_SIGNS } from '../../../model';
import { CANTILEVER, DECK, PACKS, RAIL } from './constants';
import {
  boxOver,
  evenlySpaced,
  extrudeAlongX,
  mergeParts,
  profileShape,
  sideProfile,
} from './geometry';
import type { ProfilePoint } from './geometry';
import { CANTILEVER_PROFILE, GUSSET_PROFILE, RAIL_PROFILE, STRIP_PROFILE } from './profiles';

const HALF_RUN = BEAM_M / 2 - DECK.joint / 2;

function alongBeam(points: readonly ProfilePoint[], side: number): BufferGeometry {
  return extrudeAlongX(profileShape(sideProfile(points, side)), -HALF_RUN, HALF_RUN);
}

function gusset(x: number, side: number): BufferGeometry {
  const half = CANTILEVER.gussetThickness / 2;
  return extrudeAlongX(profileShape(sideProfile(GUSSET_PROFILE, side)), x - half, x + half);
}

export function packCentres(): number[] {
  const run = PACKS.perBeam * PACKS.pitch;
  return evenlySpaced(PACKS.perBeam, -run / 2, run / 2);
}

function railHanger(x: number, side: number): BufferGeometry {
  const half = RAIL.hangerWidth / 2;
  const z: [number, number] = side > 0 ? [RAIL.inner, RAIL.outer] : [-RAIL.outer, -RAIL.inner];
  return boxOver([x - half, x + half], [RAIL.top, CANTILEVER.underside], z);
}

function gussetPositions(): number[] {
  const count = Math.floor(BEAM_M / CANTILEVER.gussetSpacing);
  return evenlySpaced(count, -BEAM_M / 2, BEAM_M / 2);
}

export function cantileverModule(detailed: boolean): BufferGeometry {
  const gussets = detailed ? gussetPositions() : [];
  return mergeParts(
    SIDE_SIGNS.flatMap((side) => [
      alongBeam(CANTILEVER_PROFILE, side),
      ...gussets.map((x) => gusset(x, side)),
      ...gussets.map((x) => railHanger(x, side)),
    ]),
  );
}

export function stripModule(): BufferGeometry {
  return mergeParts(SIDE_SIGNS.map((side) => alongBeam(STRIP_PROFILE, side)));
}

export function railModule(): BufferGeometry {
  return mergeParts(SIDE_SIGNS.map((side) => alongBeam(RAIL_PROFILE, side)));
}
