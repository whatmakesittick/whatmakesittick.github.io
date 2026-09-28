import type { BufferGeometry } from 'three';
import type { Extent } from '../../model';
import { FRAME_LIP, MODULE } from '../../model';
import { block } from './blocks';
import { mergeParts } from './merge';
import { FRAME_LIP_THICKNESS_CM, FRAME_WALL_CM } from './moduleLayout';

const FLANGE = { width: 2, thickness: 0.25 } as const;

function inwardSpan(edge: number, inward: 1 | -1, width: number): Extent {
  return inward > 0 ? [edge, edge + width] : [edge - width, edge];
}

function horizontalBar(edge: number, inward: 1 | -1): BufferGeometry[] {
  const x = [-MODULE.width / 2, MODULE.width / 2] as const;
  const span = (width: number) => inwardSpan(edge, inward, width);
  return [
    block(x, span(FRAME_WALL_CM), [0, MODULE.depth]),
    block(x, span(FRAME_LIP.faceWidth), [MODULE.depth - FRAME_LIP_THICKNESS_CM, MODULE.depth]),
    block(x, span(FLANGE.width), [0, FLANGE.thickness]),
  ];
}

function verticalBar(edge: number, inward: 1 | -1): BufferGeometry[] {
  const y = [0, MODULE.height] as const;
  const span = (width: number) => inwardSpan(edge, inward, width);
  return [
    block(span(FRAME_WALL_CM), y, [0, MODULE.depth]),
    block(span(FRAME_LIP.faceWidth), y, [MODULE.depth - FRAME_LIP_THICKNESS_CM, MODULE.depth]),
    block(span(FLANGE.width), y, [0, FLANGE.thickness]),
  ];
}

export function moduleFrameGeometry(): BufferGeometry {
  return mergeParts([
    ...horizontalBar(0, 1),
    ...horizontalBar(MODULE.height, -1),
    ...verticalBar(-MODULE.width / 2, 1),
    ...verticalBar(MODULE.width / 2, -1),
  ]);
}
