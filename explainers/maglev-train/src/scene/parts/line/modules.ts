import { CylinderGeometry } from 'three';
import type { BufferGeometry } from 'three';
import { BEAM_M, SIDE_SIGNS } from '../../../model';
import { CABLES, DECK, PACKS, TRAY } from './constants';
import {
  boxOver,
  evenlySpaced,
  extrudeAlongX,
  mergeParts,
  profileShape,
  sideProfile,
} from './geometry';
import { TRAY_PROFILE } from './profiles';
import { packCentres } from './steel';

const HALF_RUN = BEAM_M / 2 - DECK.joint / 2;
const QUARTER_TURN = Math.PI / 2;
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

function pack(x: number, side: number): BufferGeometry {
  const half = (PACKS.pitch - PACKS.gap) / 2;
  const z: [number, number] = side > 0 ? [PACKS.inner, PACKS.outer] : [-PACKS.outer, -PACKS.inner];
  return withoutFace(boxOver([x - half, x + half], [PACKS.bottom, PACKS.top], z), TOP_FACE);
}

function packStrip(side: number): BufferGeometry {
  const half = (PACKS.perBeam * PACKS.pitch) / 2;
  const z: [number, number] = side > 0 ? [PACKS.inner, PACKS.outer] : [-PACKS.outer, -PACKS.inner];
  return withoutFace(boxOver([-half, half], [PACKS.bottom, PACKS.top], z), TOP_FACE);
}

export function statorModule(detailed: boolean): BufferGeometry {
  return mergeParts(
    SIDE_SIGNS.flatMap((side) =>
      detailed ? packCentres().map((x) => pack(x, side)) : [packStrip(side)],
    ),
  );
}

function trayBracket(x: number, side: number): BufferGeometry {
  const half = TRAY.bracketWidth / 2;
  const z: [number, number] =
    side > 0 ? [TRAY.bracketInner, TRAY.outer] : [-TRAY.outer, -TRAY.bracketInner];
  return boxOver([x - half, x + half], [TRAY.bottom - TRAY.bracketDepth, TRAY.bottom], z);
}

export function trayModule(detailed: boolean): BufferGeometry {
  const brackets = detailed ? TRAY.bracketsPerBeam : 0;
  return mergeParts(
    SIDE_SIGNS.flatMap((side) => [
      extrudeAlongX(profileShape(sideProfile(TRAY_PROFILE, side)), -HALF_RUN, HALF_RUN),
      ...evenlySpaced(brackets, -BEAM_M / 2, BEAM_M / 2).map((x) => trayBracket(x, side)),
    ]),
  );
}

function cable(z: number): BufferGeometry {
  const geometry = new CylinderGeometry(
    CABLES.radius,
    CABLES.radius,
    BEAM_M,
    CABLES.segments,
    1,
    true,
  );
  geometry.rotateZ(QUARTER_TURN);
  geometry.translate(0, TRAY.bottom + TRAY.wall + CABLES.radius, z);
  return geometry;
}

export function cableModule(): BufferGeometry {
  return mergeParts(SIDE_SIGNS.flatMap((side) => CABLES.offsets.map((z) => cable(side * z))));
}
