import type { Object3D } from 'three';
import { label, namedGroup } from '../context';
import type { PartContext } from '../context';
import { buildBody } from './body';
import type { BodySpec } from './body';
import { buildBogie } from './bogie';
import { SLICE, WHEEL_RAIL } from './constants';
import { buildPantograph } from './pantograph';
import { buildPlinth } from './plinth';
import { buildTrack } from './track';

export const WHEEL_RAIL_NAME = 'wheelRail';
const LABEL_LIFT = 0.6;
const LABEL_BACK = 1.5;

export const WHEEL_RAIL_BODY: BodySpec = {
  outline: WHEEL_RAIL.outline,
  bottom: WHEEL_RAIL.bottom,
  shell: WHEEL_RAIL.shell,
  cabinFloor: WHEEL_RAIL.cabinFloor,
  seats: WHEEL_RAIL.seats,
  windows: WHEEL_RAIL.windows,
};

export function buildWheelRail(context: PartContext): Object3D {
  const group = namedGroup(WHEEL_RAIL_NAME);
  group.position.z = WHEEL_RAIL.z;
  group.add(buildPlinth(context, WHEEL_RAIL.plinthHalfWidth));
  buildTrack(context, group);
  buildBogie(context, group);
  group.add(buildBody(context, WHEEL_RAIL_BODY, 'wheelRail'));
  buildPantograph(context, group);
  const roof = WHEEL_RAIL.bottom + WHEEL_RAIL.outline.height;
  label(context, 'wheelRail', group, [SLICE.end - LABEL_BACK, roof + LABEL_LIFT, 0]);
  return group;
}
