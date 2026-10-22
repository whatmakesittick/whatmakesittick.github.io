import type { Object3D } from 'three';
import { label, namedGroup } from '../context';
import type { PartContext } from '../context';
import { L0, SLICE } from './constants';
import { buildL0Channel } from './l0Channel';
import { buildL0Vehicle } from './l0Vehicle';
import { buildPlinth } from './plinth';

export const SCMAGLEV_NAME = 'scmaglev';
const LABEL_LIFT = 0.4;
const LABEL_BACK = 1.5;

export function buildScmaglev(context: PartContext): Object3D {
  const group = namedGroup(SCMAGLEV_NAME);
  group.position.z = L0.z;
  group.add(buildPlinth(context, L0.plinthHalfWidth));
  buildL0Channel(context, group);
  buildL0Vehicle(context, group);
  const roof = L0.bottom + L0.outline.height;
  label(context, 'scmaglev', group, [SLICE.end - LABEL_BACK, roof + LABEL_LIFT, 0]);
  return group;
}
