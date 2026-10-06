import type { BufferGeometry } from 'three';
import type { Profile } from '../../geometry/profile';
import { sectionCap } from '../../geometry/sweep';
import type { CapSide, Squash } from '../../geometry/sweep';
import { mergeParts } from '../context';
import { REST_ARC } from './cutaway';

const LIFT_STEP = 0.001;

export const SLICE_LAYERS = {
  backdrop: -1,
  cover: 0,
  bodyCoil: 1,
  vacuumWall: 1,
  vacuumGap: 2,
  shieldWall: 3,
  shieldGap: 4,
  heliumWall: 5,
  vapour: 6,
  liquid: 7,
  coil: 8,
} as const;

export type SliceLayer = keyof typeof SLICE_LAYERS;

export interface CutFace {
  angle: number;
  side: CapSide;
}

export const CUT_FACES: readonly CutFace[] = [
  { angle: REST_ARC.start, side: -1 },
  { angle: REST_ARC.end, side: 1 },
];

export function sliceFaces(
  layer: SliceLayer,
  profileAt: (face: CutFace) => Profile,
  squash?: Squash,
): BufferGeometry {
  const lift = SLICE_LAYERS[layer] * LIFT_STEP;
  return mergeParts(
    CUT_FACES.map((face) => sectionCap(profileAt(face), face.angle, face.side, { squash, lift })),
  );
}

export function slice(profile: Profile, layer: SliceLayer, squash?: Squash): BufferGeometry {
  return sliceFaces(layer, () => profile, squash);
}
