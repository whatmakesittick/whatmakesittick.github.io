import type { Object3D } from 'three';
import type { PartContext } from '../context';
import { buildBody } from './body';
import { buildBogie } from './bogie';
import { WHEEL_RAIL } from './constants';
import { buildPantograph } from './pantograph';
import { buildStand } from './plinth';
import { buildTrack } from './track';

export const WHEEL_RAIL_NAME = 'wheelRail';
const LABEL_LIFT = 0.6;

export function buildWheelRail(context: PartContext): Object3D {
  const group = buildStand(context, {
    part: WHEEL_RAIL_NAME,
    z: WHEEL_RAIL.z,
    plinthHalfWidth: WHEEL_RAIL.plinthHalfWidth,
    labelY: WHEEL_RAIL.bottom + WHEEL_RAIL.outline.height + LABEL_LIFT,
  });
  buildTrack(context, group);
  buildBogie(context, group);
  group.add(buildBody(context, WHEEL_RAIL, WHEEL_RAIL_NAME));
  buildPantograph(context, group);
  return group;
}
