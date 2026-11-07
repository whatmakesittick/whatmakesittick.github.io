import type { BoxBounds } from '@core/scene/geometry/box';
import {
  CASE,
  KEY,
  KEYBOARD_WIDTH,
  KEYS,
  KEY_DIP_MM,
  KEY_LEVER,
  WHITE_KEY_PITCH,
  isBlackKey,
  keyX,
  mm,
} from '../../../model';
import type { Outline, Rect } from './geometry';

export type Notch = 'none' | 'left' | 'right' | 'both';

export const NOTCHES: readonly Notch[] = ['none', 'left', 'right', 'both'];

export const ALL_KEYS: readonly number[] = Array.from({ length: KEYS }, (_, index) => index + 1);

const BLACK_BACK_Z = -0.132;
const BLACK_FRONT_Z = BLACK_BACK_Z + KEY.blackLength;
const HEAD_CLEARANCE = 0.001;
const BLACK_DEPTH_BELOW_TOP = 0.01;
const KEY_BOTTOM = KEY.top - KEY.thickness;
const KEY_GAP = (WHITE_KEY_PITCH - KEY.whiteWidth) / 2;

export const KEY_PLAN = {
  bottom: KEY_BOTTOM,
  headBackZ: BLACK_FRONT_Z - HEAD_CLEARANCE,
  topBackZ: -0.15,
  blackFrontZ: BLACK_FRONT_Z,
  blackBackZ: BLACK_BACK_Z,
  blackBottom: KEY.top - BLACK_DEPTH_BELOW_TOP,
  blackTop: KEY.top + KEY.blackRise,
  notchEdge: WHITE_KEY_PITCH / 2 - KEY.blackWidth / 2 - KEY_GAP,
  stickWidth: 0.01,
  blackStickWidth: 0.009,
  stickOverlap: 0.002,
} as const;

const FRONT_PUNCHING = { height: 0.007, whiteZ: -0.014, blackZ: -0.058 } as const;
const BALANCE_PUNCHING = { height: 0.005 } as const;
const BACK_CLOTH = 0.004;
const PUNCHING_RADIUS = { white: 0.0045, black: 0.0035, balance: 0.004 } as const;
const FRAME_MARGIN = 0.002;
const KEYBED = { halfWidth: 0.614, frontZ: 0.012, backZ: -0.5 } as const;
const RAIL_Z = {
  front: [-0.07, -0.004],
  balance: [KEY_LEVER.pivotZ - 0.015, KEY_LEVER.pivotZ + 0.015],
  back: [-0.445, -0.405],
} as const;
const LABEL_KEY_STEP = 10;

export const FRAME_HALF_WIDTH = KEYBOARD_WIDTH / 2 + FRAME_MARGIN;

const FRONT_PUNCHING_TOP = KEY_BOTTOM - mm(KEY_DIP_MM);

export const FRAME_RAILS = {
  front: { z: RAIL_Z.front, top: FRONT_PUNCHING_TOP - FRONT_PUNCHING.height },
  balance: { z: RAIL_Z.balance, top: KEY_BOTTOM - BALANCE_PUNCHING.height },
  back: { z: RAIL_Z.back, top: KEY_BOTTOM - BACK_CLOTH },
} as const;

export function whiteNotch(key: number): Notch {
  const left = key > 1 && isBlackKey(key - 1);
  const right = key < KEYS && isBlackKey(key + 1);
  if (left && right) return 'both';
  if (left) return 'left';
  return right ? 'right' : 'none';
}

export function whiteKeysWith(notch: Notch): number[] {
  return ALL_KEYS.filter((key) => !isBlackKey(key) && whiteNotch(key) === notch);
}

export function blackKeys(): number[] {
  return ALL_KEYS.filter(isBlackKey);
}

export function whiteOutline(notch: Notch): Outline {
  const half = KEY.whiteWidth / 2;
  const { headBackZ, topBackZ, notchEdge } = KEY_PLAN;
  const left = notch === 'left' || notch === 'both' ? -notchEdge : -half;
  const right = notch === 'right' || notch === 'both' ? notchEdge : half;
  const points: [number, number][] = [
    [-half, 0],
    [half, 0],
    [half, headBackZ],
    [right, headBackZ],
    [right, topBackZ],
    [left, topBackZ],
    [left, headBackZ],
    [-half, headBackZ],
  ];
  return points.filter(([a, b], index) => {
    const [nextA, nextB] = points[(index + 1) % points.length];
    return a !== nextA || b !== nextB;
  });
}

export function blackProfile(): Outline {
  const { blackFrontZ, blackBackZ, blackBottom, blackTop } = KEY_PLAN;
  return [
    [blackBackZ, blackBottom],
    [blackFrontZ, blackBottom],
    [blackFrontZ, blackTop - 0.004],
    [blackFrontZ - 0.004, blackTop],
    [blackBackZ + 0.002, blackTop],
    [blackBackZ, blackTop - 0.002],
  ];
}

export function stickBounds(key: number): BoxBounds {
  const x = keyX(key);
  const black = isBlackKey(key);
  const half = (black ? KEY_PLAN.blackStickWidth : KEY_PLAN.stickWidth) / 2;
  return {
    minX: x - half,
    maxX: x + half,
    minY: KEY_PLAN.bottom,
    maxY: black ? KEY_PLAN.blackBottom : KEY.top,
    minZ: KEY.frontZ - KEY.length,
    maxZ: black ? KEY_PLAN.blackFrontZ : KEY_PLAN.topBackZ + KEY_PLAN.stickOverlap,
  };
}

export interface Punching {
  key: number;
  position: readonly [x: number, y: number, z: number];
  radius: number;
  height: number;
}

export function punchings(key: number): Punching[] {
  const black = isBlackKey(key);
  const x = keyX(key);
  const front: Punching = {
    key,
    position: [x, FRAME_RAILS.front.top, black ? FRONT_PUNCHING.blackZ : FRONT_PUNCHING.whiteZ],
    radius: black ? PUNCHING_RADIUS.black : PUNCHING_RADIUS.white,
    height: FRONT_PUNCHING.height,
  };
  const balance: Punching = {
    key,
    position: [x, FRAME_RAILS.balance.top, KEY_LEVER.pivotZ],
    radius: PUNCHING_RADIUS.balance,
    height: BALANCE_PUNCHING.height,
  };
  return [front, balance];
}

function railRect(rail: { z: readonly [number, number]; top: number }): Rect {
  return { a: rail.z, b: [CASE.keybedY, rail.top] };
}

export const FRAME_RAIL_RECTS: readonly Rect[] = [
  railRect(FRAME_RAILS.front),
  railRect(FRAME_RAILS.balance),
  railRect(FRAME_RAILS.back),
];

export const BACK_CLOTH_RECT: Rect = {
  a: FRAME_RAILS.back.z,
  b: [FRAME_RAILS.back.top, KEY_PLAN.bottom],
};

export function keybedRect(): Rect {
  return { a: [KEYBED.backZ, KEYBED.frontZ], b: [CASE.rimBottom, CASE.keybedY] };
}

export function keybedBounds(): BoxBounds {
  return {
    minX: -KEYBED.halfWidth,
    maxX: KEYBED.halfWidth,
    minY: CASE.rimBottom,
    maxY: CASE.keybedY,
    minZ: KEYBED.backZ,
    maxZ: KEYBED.frontZ,
  };
}

export function railBounds(rect: Rect): BoxBounds {
  return {
    minX: -FRAME_HALF_WIDTH,
    maxX: FRAME_HALF_WIDTH,
    minY: rect.b[0],
    maxY: rect.b[1],
    minZ: rect.a[0],
    maxZ: rect.a[1],
  };
}

export function keyboardLabelKey(played: number): number {
  const target = Math.min(played + LABEL_KEY_STEP, KEYS);
  return isBlackKey(target) ? target - 1 : target;
}
