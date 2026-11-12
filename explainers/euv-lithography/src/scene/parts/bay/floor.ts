import { MeshBasicMaterial } from 'three';
import type { Mesh } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { BAY_TONES } from '../../../theme';
import { registeredMesh } from '../context';
import type { PartContext } from '../context';
import type { Batch } from '../fab/batch';
import {
  PLENUM_BOTTOM,
  SLAB_BOTTOM,
  SUBFLOOR_THICKNESS,
  SUBFLOOR_TOP,
  TILE_TOP,
  WALL_THICKNESS,
} from '../fab/dims';
import { span } from '../fab/shapes';
import { FRONT_CUT, HALL, HERO, SUBFAB_COLUMN, TILE_BLOCK_M } from './dims';
import { SUBFAB_FINISH } from './finishes';
import { flat, merged, minus, worldUv } from './surfaces';
import { perforatedTileTexture } from './textures';

type Run = readonly [number, number];

function sideRuns(): Run[] {
  return [
    [HALL.minX, HERO.minX],
    [HERO.maxX, HALL.maxX],
  ];
}

function tiles(context: PartContext): Mesh {
  const planes = minus(HALL, HERO).map((rect) => worldUv(flat(rect, 0, 'up'), TILE_BLOCK_M));
  const geometry = merged(planes, 'Bay floor tiles');
  const material = new MeshBasicMaterial({
    color: BAY_TONES.floor,
    map: perforatedTileTexture(context),
    toneMapped: false,
  });
  const floor = registeredMesh(context, geometry, STRUCTURE_GROUP, material);
  floor.name = 'bayFloor';
  return floor;
}

function frontCut(batch: Batch, [from, to]: Run): void {
  const front = HALL.maxZ;
  batch.add(
    STRUCTURE_GROUP,
    'frame',
    span([from, TILE_TOP - 0.01, front - FRONT_CUT.nosing], [to, FRONT_CUT.nosingRise, front]),
  );
  batch.add(
    STRUCTURE_GROUP,
    SUBFAB_FINISH,
    span([from, SLAB_BOTTOM, front - FRONT_CUT.slab], [to, PLENUM_BOTTOM, front]),
  );
  batch.add(
    STRUCTURE_GROUP,
    SUBFAB_FINISH,
    span(
      [from, PLENUM_BOTTOM, front - FRONT_CUT.plenumInset],
      [to, TILE_TOP, front - FRONT_CUT.plenumInset + FRONT_CUT.slab],
    ),
  );
}

function subfab(batch: Batch, [from, to]: Run): void {
  const bottom = SUBFLOOR_TOP - SUBFLOOR_THICKNESS;
  const back = HERO.minZ;
  batch.add(
    STRUCTURE_GROUP,
    SUBFAB_FINISH,
    span([from, bottom, back], [to, SUBFLOOR_TOP, HALL.maxZ]),
  );
  batch.add(
    STRUCTURE_GROUP,
    SUBFAB_FINISH,
    span([from, SUBFLOOR_TOP, back], [to, SLAB_BOTTOM, back + WALL_THICKNESS]),
  );
}

function columns(batch: Batch, [from, to]: Run): void {
  const { size, pitch, reach, rowsZ } = SUBFAB_COLUMN;
  const half = size / 2;
  const start = Math.max(from, -reach);
  const end = Math.min(to, reach);
  for (let x = start + pitch / 2; x < end; x += pitch) {
    rowsZ.forEach((z) => {
      batch.add(
        STRUCTURE_GROUP,
        SUBFAB_FINISH,
        span([x - half, SUBFLOOR_TOP, z - half], [x + half, SLAB_BOTTOM, z + half]),
      );
    });
  }
}

export function buildBayFloor(context: PartContext, batch: Batch): Mesh {
  sideRuns().forEach((run) => {
    frontCut(batch, run);
    subfab(batch, run);
    columns(batch, run);
  });
  return tiles(context);
}
