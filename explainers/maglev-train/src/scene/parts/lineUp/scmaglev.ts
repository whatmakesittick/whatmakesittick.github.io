import type { Object3D } from 'three';
import type { PartContext } from '../context';
import { L0 } from './constants';
import { buildL0Channel } from './l0Channel';
import { buildL0Vehicle } from './l0Vehicle';
import { buildStand } from './plinth';

export const SCMAGLEV_NAME = 'scmaglev';
const LABEL_LIFT = 0.4;

export function buildScmaglev(context: PartContext): Object3D {
  const group = buildStand(context, {
    part: SCMAGLEV_NAME,
    z: L0.z,
    plinthHalfWidth: L0.plinthHalfWidth,
    labelY: L0.bottom + L0.outline.height + LABEL_LIFT,
  });
  buildL0Channel(context, group);
  buildL0Vehicle(context, group);
  return group;
}
