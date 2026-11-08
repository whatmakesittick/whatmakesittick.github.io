import { clamp, lerp, toRadians } from '@core/math';
import type { Extent, RegionSpec } from '@core/scene/regions';
import type { AnchorId, Point, RegionId } from '../ids';
import {
  A4_KEY,
  ACTION_RATIO,
  BLOW_MM,
  DAMPER_LIFT_MAX_MM,
  DAMPER_TOP_KEY,
  KEYS,
  LET_OFF_MM,
  LONGEST_STRING_M,
  SEMITONES_PER_OCTAVE,
  SHANK_MM,
  SHORTEST_STRING_M,
} from './constants';
import { MM_PER_M, mm } from './scale';

export const STAGE_RADIUS = 7;

export const CASE = {
  length: 2.74,
  width: 1.56,
  frontZ: 0,
  tailZ: -2.74,
  leftX: -0.78,
  rightX: 0.78,
  rimTop: 1.0,
  rimBottom: 0.63,
  rimThickness: 0.08,
  keybedY: 0.66,
  bentsideStartZ: -0.6,
} as const;

export const LID = { angleDeg: 42, thickness: 0.025 } as const;

export const LEG_SPOTS: readonly (readonly [x: number, z: number])[] = [
  [-0.66, -0.25],
  [0.66, -0.35],
  [-0.35, -2.35],
];

export const LYRE = { z: -0.35, pedalSpacing: 0.06, pedalY: 0.08, pedalLength: 0.12 } as const;

export const WHITE_KEY_PITCH = 0.0235;
export const WHITE_KEY_COUNT = 52;
export const KEYBOARD_WIDTH = WHITE_KEY_PITCH * WHITE_KEY_COUNT;
export const KEYBOARD_LEFT = -KEYBOARD_WIDTH / 2;

export const KEY = {
  frontZ: 0,
  top: 0.72,
  length: 0.46,
  thickness: 0.022,
  whiteWidth: 0.022,
  blackLength: 0.095,
  blackRise: 0.012,
  blackWidth: 0.011,
} as const;

const C_BASED_WHITE_STEP = [0, -1, 1, -1, 2, 3, -1, 4, -1, 5, -1, 6] as const;
const A0_SEMITONES_FROM_C = 9;
const A0_WHITE_STEP = 5;
const WHITES_PER_OCTAVE = 7;
const WHITE_CENTRE = 0.5;

function noteSteps(key: number): { octave: number; step: number } {
  const semitones = key - 1 + A0_SEMITONES_FROM_C;
  return {
    octave: Math.floor(semitones / SEMITONES_PER_OCTAVE),
    step: semitones % SEMITONES_PER_OCTAVE,
  };
}

export function isBlackKey(key: number): boolean {
  return C_BASED_WHITE_STEP[noteSteps(key).step] < 0;
}

function whiteOrdinal(key: number): number {
  const { octave, step } = noteSteps(key);
  return octave * WHITES_PER_OCTAVE + C_BASED_WHITE_STEP[step] - A0_WHITE_STEP;
}

export function keyX(key: number): number {
  const slots = isBlackKey(key) ? whiteOrdinal(key - 1) + 1 : whiteOrdinal(key) + WHITE_CENTRE;
  return KEYBOARD_LEFT + slots * WHITE_KEY_PITCH;
}

export const KEY_LEVER = { pivotZ: -0.23, pivotY: 0.695, frontArm: 0.23, capstanArm: 0.1 } as const;
export const CAPSTAN = { z: KEY_LEVER.pivotZ - KEY_LEVER.capstanArm, top: 0.735 } as const;
export const WIPPEN = {
  capstanArm: 0.066,
  jackArm: 0.099,
  pivotZ: CAPSTAN.z - 0.066,
  pivotY: 0.75,
} as const;
export const JACK_Z = WIPPEN.pivotZ + WIPPEN.jackArm;
export const SHANK = mm(SHANK_MM);
export const LEVER_CHAIN =
  (KEY_LEVER.capstanArm / KEY_LEVER.frontArm) * (WIPPEN.jackArm / WIPPEN.capstanArm);

export const STRINGS = {
  steelY: 0.88,
  bassY: 0.905,
  unisonSpacing: 0.0025,
  bassFanDeg: 18,
  tenorFanDeg: -6,
  bassTopKey: 20,
  tenorTopKey: 32,
  hitchExtra: 0.06,
} as const;
export const STRING_Y = STRINGS.steelY;
export const HAMMER_TOP_REST_Y = STRING_Y - mm(BLOW_MM);
export const SHIFT_MM = (STRINGS.unisonSpacing * MM_PER_M) / 2;

const HAMMER_PIVOT_Y = 0.79;
const HEAD_TOP_RISE = HAMMER_TOP_REST_Y - HAMMER_PIVOT_Y;
const HEAD_TOP_RADIUS = Math.hypot(SHANK, HEAD_TOP_RISE);
const HEAD_TOP_ELEVATION = Math.atan2(HEAD_TOP_RISE, SHANK);

export function hammerAngleForRise(riseMm: number): number {
  const lifted = Math.sin(HEAD_TOP_ELEVATION) + mm(riseMm) / HEAD_TOP_RADIUS;
  return Math.asin(clamp(lifted, -1, 1)) - HEAD_TOP_ELEVATION;
}

export function headTopOffset(angle: number): readonly [y: number, z: number] {
  const elevation = HEAD_TOP_ELEVATION + angle;
  return [HEAD_TOP_RADIUS * Math.sin(elevation), -HEAD_TOP_RADIUS * Math.cos(elevation)];
}

const DRIVE_MM = BLOW_MM - LET_OFF_MM;
const JACK_RISE_AT_LET_OFF = mm((DRIVE_MM / ACTION_RATIO) * LEVER_CHAIN);
export const KNUCKLE_ARM = JACK_RISE_AT_LET_OFF / Math.sin(hammerAngleForRise(DRIVE_MM));
export const HAMMER = {
  pivotZ: JACK_Z + KNUCKLE_ARM,
  pivotY: HAMMER_PIVOT_Y,
  headTopRise: HEAD_TOP_RISE,
  headDepth: 0.02,
} as const;
export const STRIKE_Z = HAMMER.pivotZ + headTopOffset(hammerAngleForRise(BLOW_MM))[1];

export const LET_OFF_BUTTON = { z: JACK_Z + 0.013, y: 0.775 } as const;
export const BACK_CHECK = { z: HAMMER.pivotZ - SHANK - 0.012, y: HAMMER_PIVOT_Y } as const;
export const DAMPER = { z: -0.45, headHeight: 0.03, headDepth: 0.025 } as const;
export const JACK_ANCHOR_Y = 0.785;

export const SOUNDBOARD = {
  bellyRailZ: -0.5,
  topY: 0.82,
  centreThickness: 0.009,
  edgeThickness: 0.006,
  ribSpacing: 0.14,
} as const;
export const PLATE = { topY: 0.95, thickness: 0.02 } as const;
export const BRIDGE = { height: STRING_Y - SOUNDBOARD.topY, width: 0.03 } as const;
export const TUNING_PINS = { frontZ: -0.12, backZ: -0.25 } as const;

const STRING_ANCHOR_KEY = 40;
const LOWEST_KEY = 1;
const SINGLE_STRING_TOP_KEY = 10;
const DOUBLE_STRING_TOP_KEY = 25;
const MIDDLE_STRING_M = 0.62;
const LOW_STRIKE_SHARE = 1 / 8;
const TOP_STRIKE_SHARE = 1 / 12;
const STRING_COUNTS = { single: 1, double: 2, triple: 3 } as const;

export function speakingLength(key: number): number {
  if (key <= STRING_ANCHOR_KEY) {
    const share = (key - LOWEST_KEY) / (STRING_ANCHOR_KEY - LOWEST_KEY);
    return LONGEST_STRING_M * (MIDDLE_STRING_M / LONGEST_STRING_M) ** share;
  }
  const share = (key - STRING_ANCHOR_KEY) / (KEYS - STRING_ANCHOR_KEY);
  return MIDDLE_STRING_M * (SHORTEST_STRING_M / MIDDLE_STRING_M) ** share;
}

export function stringsPerNote(key: number): number {
  if (key <= SINGLE_STRING_TOP_KEY) return STRING_COUNTS.single;
  if (key <= DOUBLE_STRING_TOP_KEY) return STRING_COUNTS.double;
  return STRING_COUNTS.triple;
}

export function isWound(key: number): boolean {
  return key <= STRINGS.bassTopKey;
}

export function hasDamper(key: number): boolean {
  return key <= DAMPER_TOP_KEY;
}

export function strikeShare(key: number): number {
  if (key <= A4_KEY) return LOW_STRIKE_SHARE;
  return lerp(LOW_STRIKE_SHARE, TOP_STRIKE_SHARE, (key - A4_KEY) / (KEYS - A4_KEY));
}

export function stringPlaneY(key: number): number {
  return isWound(key) ? STRINGS.bassY : STRINGS.steelY;
}

export function fanDegrees(key: number): number {
  if (key <= STRINGS.bassTopKey) return STRINGS.bassFanDeg;
  if (key <= STRINGS.tenorTopKey) return STRINGS.tenorFanDeg;
  return 0;
}

export interface StringPath {
  front: Point;
  strike: Point;
  back: Point;
  hitch: Point;
}

function offset([x, y, z]: Point, [dx, , dz]: Point, distance: number): Point {
  return [x + dx * distance, y, z + dz * distance];
}

export function stringDirection(key: number): Point {
  const angle = toRadians(fanDegrees(key));
  return [Math.sin(angle), 0, -Math.cos(angle)];
}

export function stringPath(key: number): StringPath {
  const length = speakingLength(key);
  const direction = stringDirection(key);
  const strike: Point = [keyX(key), stringPlaneY(key), STRIKE_Z];
  const front = offset(strike, direction, -strikeShare(key) * length);
  const back = offset(front, direction, length);
  return { front, strike, back, hitch: offset(back, direction, STRINGS.hitchExtra) };
}

export const CUT_OFFSET = 0.0128;

export function cutX(key: number): number {
  return keyX(key) - CUT_OFFSET;
}

export const INSET = { width: 0.2, height: 0.14, scale: 4, depth: 0.01 } as const;
const INSET_OFFSET: Point = [-0.03, 1.04, -0.18];

export function insetCentre(key: number): Point {
  return [keyX(key) + INSET_OFFSET[0], INSET_OFFSET[1], INSET_OFFSET[2]];
}

export function jackAnchor(key: number): Point {
  return [keyX(key), JACK_ANCHOR_Y, JACK_Z];
}

export const UPRIGHT = {
  offsetZ: 0.58,
  stringZ: 0.08,
  stringBottom: 0.75,
  stringTop: 1.3,
  shank: 0.12,
  hammerPivotY: 0.86,
} as const;

export const HARPSICHORD = {
  offsetZ: 0.96,
  keyLength: 0.34,
  stringY: 0.8,
  jackHeight: 0.12,
} as const;

export function lidTip(): Point {
  const angle = toRadians(LID.angleDeg);
  return [
    CASE.leftX + CASE.width * Math.cos(angle),
    CASE.rimTop + CASE.width * Math.sin(angle),
    CASE.frontZ,
  ];
}

export interface RegionOptions {
  ghost: boolean;
  inset: boolean;
}

const ACTION_HALF_WIDTH = 0.06;
const ESCAPEMENT_HALF_WIDTH = 0.04;
const NEIGHBOUR_DAMPERS = 6;
const STRING_MARGIN = 0.03;
const FLOOR_Y = 0;
const ACTION_REGION = { y: [CASE.keybedY, 0.95], z: [-0.47, 0.02] } as const;
const ESCAPEMENT_REGION = { y: [0.74, 0.9], z: [-0.43, -0.26] } as const;
const DAMPERS_REGION = { y: [0.8, 0.96], z: [-0.5, -0.38] } as const;
const LINE_UP_REGION = { y: [0.62, 1.32], z: [-0.47, HARPSICHORD.offsetZ + 0.02] } as const;
const GHOST_REGION = { yTop: UPRIGHT.stringTop, zFront: UPRIGHT.offsetZ + 0.02 } as const;
const STRING_REGION_DEPTH = 0.06;

function around(centre: number, half: number): Extent {
  return [centre - half, centre + half];
}

function grandRegion(): RegionSpec {
  return {
    x: [CASE.leftX, CASE.rightX],
    y: [FLOOR_Y, lidTip()[1]],
    z: [CASE.tailZ, CASE.frontZ + STRING_MARGIN],
  };
}

function actionRegion(key: number, { ghost }: RegionOptions): RegionSpec {
  return {
    x: around(keyX(key), ACTION_HALF_WIDTH),
    y: [ACTION_REGION.y[0], ghost ? GHOST_REGION.yTop : ACTION_REGION.y[1]],
    z: [ACTION_REGION.z[0], ghost ? GHOST_REGION.zFront : ACTION_REGION.z[1]],
  };
}

function escapementRegion(key: number, { inset }: RegionOptions): RegionSpec {
  const panel = insetCentre(key);
  return {
    x: around(keyX(key), ESCAPEMENT_HALF_WIDTH),
    y: [ESCAPEMENT_REGION.y[0], inset ? panel[1] + INSET.height / 2 : ESCAPEMENT_REGION.y[1]],
    z: [ESCAPEMENT_REGION.z[0], inset ? panel[2] + INSET.width / 2 : ESCAPEMENT_REGION.z[1]],
  };
}

function dampersRegion(key: number): RegionSpec {
  const lowest = clamp(key - NEIGHBOUR_DAMPERS, LOWEST_KEY, KEYS);
  const highest = clamp(key + NEIGHBOUR_DAMPERS, LOWEST_KEY, KEYS);
  return {
    x: [keyX(lowest) - WHITE_KEY_PITCH, keyX(highest) + WHITE_KEY_PITCH],
    y: [DAMPERS_REGION.y[0], DAMPERS_REGION.y[1]],
    z: [DAMPERS_REGION.z[0], DAMPERS_REGION.z[1]],
  };
}

function stringRegion(key: number): RegionSpec {
  const { front, hitch } = stringPath(key);
  return {
    x: [Math.min(front[0], hitch[0]) - STRING_MARGIN, Math.max(front[0], hitch[0]) + STRING_MARGIN],
    y: [SOUNDBOARD.topY - STRING_REGION_DEPTH, PLATE.topY],
    z: [hitch[2] - STRING_MARGIN, front[2] + STRING_MARGIN],
  };
}

function lineUpRegion(key: number): RegionSpec {
  return {
    x: around(keyX(key), ACTION_HALF_WIDTH),
    y: [LINE_UP_REGION.y[0], LINE_UP_REGION.y[1]],
    z: [LINE_UP_REGION.z[0], LINE_UP_REGION.z[1]],
  };
}

export function regionSpecFor(id: RegionId, key: number, options: RegionOptions): RegionSpec {
  if (id === 'grand') return grandRegion();
  if (id === 'action') return actionRegion(key, options);
  if (id === 'escapement') return escapementRegion(key, options);
  if (id === 'dampers') return dampersRegion(key);
  if (id === 'string') return stringRegion(key);
  return lineUpRegion(key);
}

function centreOf({ x, y, z }: RegionSpec): Point {
  return [(x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2];
}

export function restAnchorPoint(id: AnchorId, key: number): Point {
  const x = keyX(key);
  if (id === 'key') return [x, KEY.top, KEY.frontZ];
  if (id === 'hammer') return [x, HAMMER_TOP_REST_Y, STRIKE_Z];
  if (id === 'jack') return jackAnchor(key);
  if (id === 'damper') return [x, STRING_Y + DAMPER.headHeight, DAMPER.z];
  if (id === 'inset') return insetCentre(key);
  if (id === 'bridge') return stringPath(key).back;
  return centreOf(lineUpRegion(key));
}

export const DAMPER_LIFT_MAX = mm(DAMPER_LIFT_MAX_MM);
