import { MeshStandardMaterial, PlaneGeometry } from 'three';
import type { Object3D } from 'three';
import { MASK } from '../../../model/layout';
import { mesh, registeredMaterial, registeredMesh } from '../context';
import type { PartContext } from '../context';
import {
  CHUCK,
  MASK_ORIGIN,
  MASK_THICK,
  PATTERN_GAP,
  PELLICLE,
  PELLICLE_REL_Y,
  PLATE_BOTTOM,
  PLATE_TOP,
} from './dims';
import { addPieces, rod, slab } from './pieces';
import type { Piece } from './pieces';
import { maskPatternTexture } from './textures';

const PLATE_RADIUS = 0.002;
const CLAMP_EDGE = 0.02;
const SIDES = [-1, 1] as const;
const MEMBRANE_SLACK = 0.004;

function chuckPieces(): Piece[] {
  const half = MASK.plateM / 2;
  const middle = PLATE_TOP + CHUCK.tall / 2;
  const clamps = SIDES.flatMap((x) =>
    SIDES.map((z) =>
      slab(
        'bolt',
        [
          x * (half - CLAMP_EDGE / 2),
          PLATE_TOP + CHUCK.clamp[1] / 2,
          z * (half - CHUCK.clamp[2] / 2),
        ],
        CHUCK.clamp,
        0.003,
      ),
    ),
  );
  return [
    slab('darkFrame', [0, middle, 0], [CHUCK.half * 2, CHUCK.tall, CHUCK.half * 2], 0.006),
    slab('flange', [0, middle, 0], [CHUCK.half * 1.2, CHUCK.tall + 0.004, CHUCK.half * 1.2], 0.004),
    ...clamps,
  ];
}

export function buildMask(context: PartContext, carriage: Object3D): void {
  const plate = mesh(
    context,
    slab('maskPlate', [0, 0, 0], [MASK.plateM, MASK_THICK, MASK.plateM], PLATE_RADIUS).geometry,
    'mask',
    'maskPlate',
  );
  plate.position.set(
    MASK_ORIGIN[0],
    MASK_ORIGIN[1] + (PLATE_BOTTOM + PLATE_TOP) / 2,
    MASK_ORIGIN[2],
  );
  const material = registeredMaterial(
    context,
    'mask',
    new MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.2,
      metalness: 0.6,
      map: maskPatternTexture(context),
    }),
  );
  const pattern = registeredMesh(
    context,
    new PlaneGeometry(MASK.patternM.height, MASK.patternM.width).rotateX(Math.PI / 2),
    'mask',
    material,
  );
  pattern.position.set(MASK_ORIGIN[0], MASK_ORIGIN[1] + PLATE_BOTTOM - PATTERN_GAP, MASK_ORIGIN[2]);
  carriage.add(plate, pattern);
  addPieces(context, 'mask', carriage, chuckPieces(), MASK_ORIGIN);
}

export function buildPellicle(context: PartContext, carriage: Object3D): void {
  const { x, z, bar, tall, post } = PELLICLE;
  const long = (length: number, at: readonly [number, number, number]) =>
    slab('frame', at, [length, tall, bar]);
  const frame: Piece[] = SIDES.flatMap((side) => [
    long(x, [0, PELLICLE_REL_Y, side * (z / 2 - bar / 2)]),
    slab('frame', [side * (x / 2 - bar / 2), PELLICLE_REL_Y, 0], [bar, tall, z - bar * 2]),
  ]);
  const postLength = PLATE_BOTTOM - PELLICLE_REL_Y;
  const posts = SIDES.flatMap((sx) =>
    SIDES.map((sz) =>
      rod(
        'flange',
        [sx * (x / 2 - bar / 2), PELLICLE_REL_Y + postLength / 2, sz * (z / 2 - bar / 2)],
        post,
        postLength,
        'y',
      ),
    ),
  );
  addPieces(context, 'pellicle', carriage, [...frame, ...posts], MASK_ORIGIN);
  const film = mesh(
    context,
    new PlaneGeometry(x - bar * 2 + MEMBRANE_SLACK, z - bar * 2 + MEMBRANE_SLACK).rotateX(
      Math.PI / 2,
    ),
    'pellicle',
    'membrane',
  );
  film.position.set(MASK_ORIGIN[0], MASK_ORIGIN[1] + PELLICLE_REL_Y, MASK_ORIGIN[2]);
  carriage.add(film);
}
