import type { RegionSpec } from '@core/scene/regions';
import { CHAMBER_IDS, VALVE_IDS } from '../ids';
import type { ChamberId, RegionId, ValveId } from '../ids';
import { HEART_EXTENT, SCENE_EXTENT, VALVES, chamberOuterBox, pad, union } from '../model';
import type { Box, Point } from '../model';
import { PULMONARY_RING } from './constants';

const REGION_MARGIN_MM = 6;

export function ringCentre(valve: ValveId): Point {
  return valve === 'pulmonary' ? PULMONARY_RING : VALVES[valve].centre;
}

function chamberUnion(chambers: readonly ChamberId[]): Box {
  return pad(union(chambers.map(chamberOuterBox)), REGION_MARGIN_MM);
}

function ringBox(valve: ValveId): Box {
  const [x, y, z] = ringCentre(valve);
  const { radius } = VALVES[valve];
  return { x: [x - radius, x + radius], y: [y - radius, y + radius], z: [z - radius, z + radius] };
}

function valveBand(): Box {
  return pad(union(VALVE_IDS.map(ringBox)), REGION_MARGIN_MM);
}

export const REGIONS: Readonly<Record<RegionId, RegionSpec>> = {
  scene: SCENE_EXTENT,
  heart: HEART_EXTENT,
  chambers: chamberUnion(CHAMBER_IDS),
  leftHeart: chamberUnion(['leftAtrium', 'leftVentricle']),
  rightHeart: chamberUnion(['rightAtrium', 'rightVentricle']),
  conduction: chamberUnion(['rightAtrium', 'rightVentricle', 'leftVentricle']),
  valves: valveBand(),
  atria: chamberUnion(['rightAtrium', 'leftAtrium']),
  ventricles: chamberUnion(['rightVentricle', 'leftVentricle']),
};
