import type { IUniform } from 'three';
import { DAMPER, STRIKE_Z, keyX } from '../../model';
import { ACTION_RAILS } from './action/rails';
import { CloseMask } from './closeMask';
import type { KeepBox } from './closeMask';

const FAR = 1e3;
const NEIGHBOURS = { from: 0.005, reach: 0.037, back: -0.425 } as const;
const RAIL_STUB = { half: 0.0125, back: -0.425 } as const;
const STRING_STUB = { half: 0.004, front: STRIKE_Z + 0.06, back: DAMPER.z - 0.025 } as const;
const CAP_PAD = 0.002;
const NEIGHBOUR_LOOK = { soft: 0.001, veil: 0, tone: 0.3 } as const;
const STUB_EDGE = { soft: 0.006 } as const;
const RAIL_EDGE = { soft: 0.001 } as const;

export function neighbourBox(key: number): KeepBox {
  const x = keyX(key);
  return {
    min: [x + NEIGHBOURS.from, -FAR, NEIGHBOURS.back],
    max: [x + NEIGHBOURS.reach, FAR, FAR],
  };
}

export function railStubBox(key: number): KeepBox {
  const x = keyX(key);
  return { min: [x - RAIL_STUB.half, -FAR, RAIL_STUB.back], max: [x + RAIL_STUB.half, FAR, FAR] };
}

export function stringStubBox(key: number): KeepBox {
  const x = keyX(key);
  return {
    min: [x - STRING_STUB.half, -FAR, STRING_STUB.back],
    max: [x + STRING_STUB.half, FAR, STRING_STUB.front],
  };
}

export const RAIL_CAP_BOX: KeepBox = {
  min: [
    -FAR,
    Math.min(...ACTION_RAILS.map(({ b }) => b[0])) - CAP_PAD,
    Math.min(...ACTION_RAILS.map(({ a }) => a[0])) - CAP_PAD,
  ],
  max: [
    FAR,
    Math.max(...ACTION_RAILS.map(({ b }) => b[1])) + CAP_PAD,
    Math.max(...ACTION_RAILS.map(({ a }) => a[1])) + CAP_PAD,
  ],
};

export function hidingMask(amount: IUniform<number>): CloseMask {
  return new CloseMask(amount);
}

export function neighbourMask(amount: IUniform<number>): CloseMask {
  return new CloseMask(amount, NEIGHBOUR_LOOK);
}

export function stubMask(amount: IUniform<number>): CloseMask {
  return new CloseMask(amount, STUB_EDGE);
}

export function railStubMask(amount: IUniform<number>): CloseMask {
  return new CloseMask(amount, RAIL_EDGE);
}

export function railCapMask(amount: IUniform<number>): CloseMask {
  const mask = new CloseMask(amount);
  mask.keep(RAIL_CAP_BOX);
  return mask;
}
