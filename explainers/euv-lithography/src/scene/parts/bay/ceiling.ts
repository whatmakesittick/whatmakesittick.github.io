import { MeshBasicMaterial, PlaneGeometry } from 'three';
import type { Mesh } from 'three';
import { STRUCTURE_GROUP, UNDIMMED_GROUP } from '@core/scene/materials';
import { BAY_TONES } from '../../../theme';
import { registeredMesh } from '../context';
import type { PartContext } from '../context';
import { CELL_M, CELL_OFFSET_Z, CEILING_Y, HALL, STRIP } from './dims';
import { GLOW, glowColour } from './finishes';
import { flat, merged, worldUv } from './surfaces';
import { ceilingTexture } from './textures';

const QUARTER_TURN = Math.PI / 2;

export interface StripSpot {
  readonly x: number;
  readonly z: number;
}

export function stripSpots(reach: number): StripSpot[] {
  const count = Math.floor((reach * 2) / STRIP.pitch);
  const first = -((count - 1) * STRIP.pitch) / 2;
  return STRIP.rowsZ.flatMap((z) =>
    Array.from({ length: count }, (_, index) => ({ x: first + index * STRIP.pitch, z })),
  );
}

export function buildCeiling(context: PartContext): Mesh {
  const geometry = worldUv(flat(HALL, CEILING_Y, 'down'), CELL_M, CELL_OFFSET_Z);
  const material = new MeshBasicMaterial({
    color: BAY_TONES.ceiling,
    map: ceilingTexture(context),
    toneMapped: false,
  });
  const ceiling = registeredMesh(context, geometry, STRUCTURE_GROUP, material);
  ceiling.name = 'ceiling';
  return ceiling;
}

export function buildStrips(context: PartContext): Mesh {
  const quads = stripSpots(STRIP.reach).map(({ x, z }) =>
    new PlaneGeometry(STRIP.length, STRIP.width)
      .rotateX(QUARTER_TURN)
      .translate(x, CEILING_Y - STRIP.drop, z),
  );
  const geometry = merged(quads, 'Ceiling strips');
  const material = new MeshBasicMaterial({ color: glowColour(BAY_TONES.lamp, GLOW.strip) });
  const strips = registeredMesh(context, geometry, UNDIMMED_GROUP, material);
  strips.name = 'strips';
  return strips;
}
