import { BoxGeometry, Matrix4, Mesh, Quaternion, RepeatWrapping, Vector3 } from 'three';
import type { Group } from 'three';
import type { PlanPoint } from '@core/scene/geometry/extrude';
import { box } from '@core/scene/geometry/box';
import { SOUNDBOARD } from '../../../model';
import { FINISHES } from '../../finishes';
import { canvasTexture } from '../canvasTexture';
import { namedGroup, partMesh } from '../context';
import type { PartContext } from '../context';
import { BELLY_RAIL, BOARD } from './constants';
import {
  BELLY_RAIL_BOUNDS,
  BOARD_CENTRE,
  BOARD_RING,
  BOARD_STEINER,
  GRAIN,
  RIBS,
  RIB_LEVELS,
  boardBottom,
} from './boardPlan';
import { instances, patchedMaterial } from './materials';
import type { VertexPatch } from './patches';
import { dot, leftOf, sub } from './planMath';
import { seeded } from './random';
import { slabGeometry } from './slab';

const GRAIN_PAINT = {
  width: 256,
  height: 512,
  bands: 40,
  streaks: 320,
  seed: 0x5eed,
  base: '#ffffff',
  dark: '#8f6a3e',
  band: { min: 2, spread: 7, alpha: 0.035, alphaSpread: 0.05 },
  streak: { min: 0.5, spread: 1.4, alpha: 0.06, alphaSpread: 0.16 },
} as const;
const GRAIN_TILE = { along: 0.9, across: 0.45 } as const;
const GRAIN_ANISOTROPY = 4;
export const RAIL_TOP = SOUNDBOARD.topY - BOARD.edgeThickness;
interface Stroke {
  readonly min: number;
  readonly spread: number;
  readonly alpha: number;
  readonly alphaSpread: number;
}

function paintLines(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  count: number,
  stroke: Stroke,
  next: () => number,
): void {
  for (let index = 0; index < count; index += 1) {
    context.globalAlpha = stroke.alpha + next() * stroke.alphaSpread;
    context.fillRect(0, next() * height, width, stroke.min + next() * stroke.spread);
  }
}

function paintGrain(context: CanvasRenderingContext2D, width: number, height: number): void {
  const next = seeded(GRAIN_PAINT.seed);
  context.fillStyle = GRAIN_PAINT.base;
  context.fillRect(0, 0, width, height);
  context.fillStyle = GRAIN_PAINT.dark;
  paintLines(context, width, height, GRAIN_PAINT.bands, GRAIN_PAINT.band, next);
  paintLines(context, width, height, GRAIN_PAINT.streaks, GRAIN_PAINT.streak, next);
  context.globalAlpha = 1;
}

function grainUv(point: PlanPoint): readonly [number, number] {
  const offset = sub(point, BOARD_CENTRE);
  return [dot(offset, GRAIN) / GRAIN_TILE.along, dot(offset, leftOf(GRAIN)) / GRAIN_TILE.across];
}

function boardMesh(context: PartContext, breath: VertexPatch): Mesh {
  const grain = context.tracker.track(
    canvasTexture(GRAIN_PAINT.width, GRAIN_PAINT.height, paintGrain, {
      wrapT: RepeatWrapping,
      anisotropy: GRAIN_ANISOTROPY,
    }),
  );
  const geometry = slabGeometry({
    ring: BOARD_RING,
    inner: BOARD_STEINER,
    top: () => SOUNDBOARD.topY,
    bottom: boardBottom,
    uv: grainUv,
  });
  const material = patchedMaterial(context, {
    group: 'soundboard',
    finish: FINISHES.spruce,
    patch: breath,
    extra: { map: grain },
  });
  const mesh = new Mesh(context.tracker.track(geometry), material);
  mesh.name = 'soundboard';
  return mesh;
}

function ribMeshes(context: PartContext, breath: VertexPatch): Mesh {
  const material = patchedMaterial(context, {
    group: 'soundboard',
    finish: FINISHES.rib,
    patch: breath,
  });
  const mesh = instances(context, new BoxGeometry(1, 1, 1), material, RIBS.length);
  const height = RIB_LEVELS.top - RIB_LEVELS.bottom;
  const matrix = new Matrix4();
  const turn = new Quaternion();
  const up = new Vector3(0, 1, 0);
  RIBS.forEach(({ start, end }, index) => {
    const length = Math.hypot(end.x - start.x, end.z - start.z);
    turn.setFromAxisAngle(up, Math.atan2(end.x - start.x, end.z - start.z));
    matrix.compose(
      new Vector3((start.x + end.x) / 2, RIB_LEVELS.bottom + height / 2, (start.z + end.z) / 2),
      turn,
      new Vector3(BOARD.ribWidth, height, length),
    );
    mesh.setMatrixAt(index, matrix);
  });
  mesh.computeBoundingSphere();
  mesh.name = 'ribs';
  return mesh;
}

function bellyRail(context: PartContext): Mesh {
  const { minX, maxX, minZ, maxZ } = BELLY_RAIL_BOUNDS;
  const geometry = box({ minX, maxX, minY: BELLY_RAIL.bottom, maxY: RAIL_TOP, minZ, maxZ });
  return partMesh(context, geometry, 'structure', FINISHES.darkWood);
}

export interface SoundboardParts {
  readonly group: Group;
  readonly rail: Mesh;
}

export function createSoundboard(context: PartContext, breath: VertexPatch): SoundboardParts {
  const group = namedGroup('soundboard');
  group.add(boardMesh(context, breath), ribMeshes(context, breath));
  return { group, rail: bellyRail(context) };
}
