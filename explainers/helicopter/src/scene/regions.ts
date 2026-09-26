import { Box3, Vector3 } from 'three';
import type { Matrix4 } from 'three';
import { ROTOR } from '../model';
import { HUB, MAST, SKIDS, TAIL_ROTOR } from './constants';

export type RegionId = 'all' | 'airframe' | 'plan' | 'hub' | 'tail';

const DISC_CLEARANCE = 0.45;
const AIRFRAME_REACH = { front: 0.75, side: 0.55 } as const;
const HUB_REACH = 1.3;
const HUB_BELOW = 0.15;
const TAIL_BOX = { front: -4.9, bottom: 0.85, top: 2.85, near: -0.95, far: 0.35 } as const;

const TAIL_END = TAIL_ROTOR.centerX - TAIL_ROTOR.radius;
const DISC_TOP = HUB.height + DISC_CLEARANCE;

const LOCAL_REGIONS: Record<RegionId, Box3> = {
  all: new Box3(
    new Vector3(TAIL_END, 0, -ROTOR.radiusMetres),
    new Vector3(ROTOR.radiusMetres, DISC_TOP, ROTOR.radiusMetres),
  ),
  airframe: new Box3(
    new Vector3(TAIL_END, 0, -ROTOR.radiusMetres * AIRFRAME_REACH.side),
    new Vector3(
      ROTOR.radiusMetres * AIRFRAME_REACH.front,
      DISC_TOP,
      ROTOR.radiusMetres * AIRFRAME_REACH.side,
    ),
  ),
  plan: new Box3(
    new Vector3(TAIL_END, SKIDS.tubeRadius, -ROTOR.radiusMetres),
    new Vector3(ROTOR.radiusMetres, DISC_TOP, ROTOR.radiusMetres),
  ),
  hub: new Box3(
    new Vector3(-HUB_REACH, MAST.bottom - HUB_BELOW, -HUB_REACH),
    new Vector3(HUB_REACH, DISC_TOP, HUB_REACH),
  ),
  tail: new Box3(
    new Vector3(TAIL_END, TAIL_BOX.bottom, TAIL_BOX.near),
    new Vector3(TAIL_BOX.front, TAIL_BOX.top, TAIL_BOX.far),
  ),
};

export function regionBox(id: RegionId, rootMatrix: Matrix4): Box3 {
  return LOCAL_REGIONS[id].clone().applyMatrix4(rootMatrix);
}
