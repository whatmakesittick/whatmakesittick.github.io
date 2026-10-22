import type { Range } from '../random';
import { GROUND, pierGap } from '../constants';

export type LinearKind = 'road' | 'lane' | 'canal' | 'river';
export type Axis = 'x' | 'z';

export interface Linear {
  readonly kind: LinearKind;
  readonly axis: Axis;
  readonly centre: number;
  readonly width: number;
  readonly span: Range;
}

const REACH = GROUND.reach;
const TILE: Range = [0, GROUND.period];

function parallel(kind: LinearKind, centre: number, width: number): Linear {
  return { kind, axis: 'x', centre, width, span: TILE };
}

function crossing(kind: LinearKind, centre: number, width: number, span: Range): Linear {
  return { kind, axis: 'z', centre, width, span };
}

export const VERGES: Readonly<Record<LinearKind, number>> = {
  road: 2.2,
  lane: 1.2,
  canal: 2.4,
  river: 4,
};

export const LINEARS: readonly Linear[] = [
  parallel('road', 46, 7.5),
  parallel('canal', -47, 8),
  parallel('lane', -124, 4),
  parallel('canal', 134, 11),
  parallel('lane', 238, 4),
  parallel('river', -270, 26),
  parallel('lane', -402, 4.5),
  parallel('road', 432, 10),
  parallel('canal', 616, 14),
  parallel('lane', -652, 5),
  parallel('canal', -912, 16),
  parallel('road', 984, 12),
  parallel('lane', -1248, 6),
  parallel('canal', 1426, 18),
  parallel('road', -1630, 14),
  crossing('road', pierGap(6), 7, [-REACH, REACH]),
  crossing('lane', pierGap(13), 4, [-270, 134]),
  crossing('canal', 58, 8, [134, REACH]),
  crossing('canal', 286, 9, [-REACH, -47]),
  crossing('lane', 360, 4, [238, 616]),
  crossing('lane', 22, 4, [-652, -270]),
  crossing('canal', 250, 12, [616, REACH]),
  crossing('lane', 110, 5, [-REACH, -912]),
];
