import type { BufferGeometry } from 'three';
import { MODULE } from '../../model';
import { around, block } from './blocks';
import { mergeParts } from './merge';
import { COLUMN_PITCH_CM } from './moduleLayout';

export const JUNCTION_BOX = {
  width: 8,
  height: 6,
  depth: 1.8,
  lid: { inset: 0.6, depth: 0.3 },
  y: MODULE.height / 2,
  groupsApart: 2,
} as const;

export function junctionBoxCentres(): readonly number[] {
  const step = JUNCTION_BOX.groupsApart * COLUMN_PITCH_CM;
  return [-step, 0, step];
}

export function junctionBoxGeometry(back: number, x: number): BufferGeometry {
  const { width, height, depth, lid, y } = JUNCTION_BOX;
  return mergeParts([
    block(around(x, width), around(y, height), [back - depth, back]),
    block(around(x, width - 2 * lid.inset), around(y, height - 2 * lid.inset), [
      back - depth - lid.depth,
      back - depth,
    ]),
  ]);
}
