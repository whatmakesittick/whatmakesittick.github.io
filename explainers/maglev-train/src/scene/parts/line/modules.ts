import { Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { BEAM_M, SIDE_SIGNS } from '../../../model';
import { CABLES, PACKS, TRAY } from './constants';
import {
  around,
  boxOver,
  cylinderBetween,
  evenlySpaced,
  extrudeSide,
  mergeParts,
  sideSpan,
} from './geometry';
import type { Span } from './geometry';
import { TRAY_PROFILE } from './profiles';
import { HALF_RUN, packCentres } from './steel';

const TOP_FACE = 2;
const INDICES_PER_FACE = 6;

function withoutFace(geometry: BufferGeometry, face: number): BufferGeometry {
  const index = geometry.getIndex();
  if (!index) return geometry;
  const values = Array.from(index.array);
  values.splice(face * INDICES_PER_FACE, INDICES_PER_FACE);
  geometry.setIndex(values);
  geometry.clearGroups();
  return geometry;
}

function pack(along: Span, side: number): BufferGeometry {
  const box = boxOver(along, [PACKS.bottom, PACKS.top], sideSpan(side, PACKS.inner, PACKS.outer));
  return withoutFace(box, TOP_FACE);
}

export function statorModule(detailed: boolean): BufferGeometry {
  const strip = around(0, PACKS.perBeam * PACKS.pitch);
  const runs = detailed ? packCentres().map((x) => around(x, PACKS.pitch - PACKS.gap)) : [strip];
  return mergeParts(SIDE_SIGNS.flatMap((side) => runs.map((along) => pack(along, side))));
}

function trayBracket(x: number, side: number): BufferGeometry {
  return boxOver(
    around(x, TRAY.bracketWidth),
    [TRAY.bottom - TRAY.bracketDepth, TRAY.bottom],
    sideSpan(side, TRAY.bracketInner, TRAY.outer),
  );
}

export function trayModule(detailed: boolean): BufferGeometry {
  const brackets = detailed ? TRAY.bracketsPerBeam : 0;
  return mergeParts(
    SIDE_SIGNS.flatMap((side) => [
      extrudeSide(TRAY_PROFILE, side, -HALF_RUN, HALF_RUN),
      ...evenlySpaced(brackets, -BEAM_M / 2, BEAM_M / 2).map((x) => trayBracket(x, side)),
    ]),
  );
}

function cable(z: number): BufferGeometry {
  const y = TRAY.bottom + TRAY.wall + CABLES.radius;
  return cylinderBetween(
    new Vector3(BEAM_M / 2, y, z),
    new Vector3(-BEAM_M / 2, y, z),
    [CABLES.radius, CABLES.radius],
    CABLES.segments,
  );
}

export function cableModule(): BufferGeometry {
  return mergeParts(SIDE_SIGNS.flatMap((side) => CABLES.offsets.map((z) => cable(side * z))));
}
