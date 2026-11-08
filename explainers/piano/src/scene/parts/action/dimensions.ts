import {
  BACK_CHECK,
  CAPSTAN,
  DAMPER,
  HAMMER,
  JACK_ANCHOR_Y,
  JACK_Z,
  KEY,
  KNUCKLE_ARM,
  LET_OFF_BUTTON,
  WIPPEN,
} from '../../../model';
import type { Outline, Rect } from '../keyboard/geometry';

const LET_OFF_GAP = 0.0034;
const DROP_GAP = 0.0052;
const REPETITION_RISE = 0.006;
const REPETITION_SLOPE = 0.1;
const CUSHION = 0.003;

export const WIPPEN_X = [-0.005, 0.0085] as const;
export const CHEEK_X = [0.0035, 0.0075] as const;
export const JACK_HALF_WIDTH = 0.003;

const HEEL_BOTTOM = CAPSTAN.top + CUSHION;

export const WIPPEN_PROFILE: Outline = [
  [WIPPEN.pivotZ - 0.009, WIPPEN.pivotY - 0.004],
  [WIPPEN.pivotZ - 0.009, WIPPEN.pivotY + 0.005],
  [WIPPEN.pivotZ + 0.026, WIPPEN.pivotY + 0.008],
  [JACK_Z + 0.007, WIPPEN.pivotY + 0.008],
  [JACK_Z + 0.007, WIPPEN.pivotY + 0.001],
  [CAPSTAN.z + 0.016, WIPPEN.pivotY - 0.004],
  [CAPSTAN.z + 0.008, WIPPEN.pivotY - 0.005],
  [CAPSTAN.z + 0.006, HEEL_BOTTOM],
  [CAPSTAN.z - 0.006, HEEL_BOTTOM],
  [CAPSTAN.z - 0.009, WIPPEN.pivotY - 0.005],
  [WIPPEN.pivotZ + 0.026, WIPPEN.pivotY - 0.006],
];

export const CUSHION_RECT: Rect = {
  a: [CAPSTAN.z - 0.007, CAPSTAN.z + 0.007],
  b: [CAPSTAN.top, HEEL_BOTTOM],
};

export const JACK_PIVOT = { y: WIPPEN.pivotY + 0.009, z: JACK_Z } as const;

const JACK_TAIL_TOP = LET_OFF_BUTTON.y - LET_OFF_GAP;
const JACK_TOE_FRONT = LET_OFF_BUTTON.z + 0.004;
const JACK_ARM = 0.0035;

export const JACK_PROFILE: Outline = [
  [JACK_Z - JACK_ARM, WIPPEN.pivotY + 0.005],
  [JACK_Z + 0.0015, WIPPEN.pivotY + 0.005],
  [JACK_Z + 0.006, JACK_PIVOT.y],
  [JACK_TOE_FRONT, JACK_TAIL_TOP - 0.004],
  [JACK_TOE_FRONT, JACK_TAIL_TOP],
  [JACK_Z + JACK_ARM, JACK_TAIL_TOP],
  [JACK_Z + JACK_ARM, JACK_ANCHOR_Y - 0.002],
  [JACK_Z + 0.0025, JACK_ANCHOR_Y],
  [JACK_Z - 0.0015, JACK_ANCHOR_Y],
  [JACK_Z - JACK_ARM, JACK_ANCHOR_Y - 0.003],
];

export const REPETITION_PIVOT = { y: WIPPEN.pivotY + 0.024, z: WIPPEN.pivotZ + 0.049 } as const;

const REPETITION_TIP_Z = HAMMER.pivotZ - 0.0045;

function repetitionTop(z: number): number {
  return REPETITION_PIVOT.y + REPETITION_RISE + REPETITION_SLOPE * (z - REPETITION_PIVOT.z);
}

export const REPETITION_PROFILE: Outline = [
  [REPETITION_PIVOT.z - 0.007, REPETITION_PIVOT.y - 0.003],
  [REPETITION_PIVOT.z - 0.007, repetitionTop(REPETITION_PIVOT.z - 0.007)],
  [REPETITION_TIP_Z, repetitionTop(REPETITION_TIP_Z)],
  [REPETITION_TIP_Z, repetitionTop(REPETITION_TIP_Z) - 0.0045],
  [REPETITION_PIVOT.z + 0.04, REPETITION_PIVOT.y + 0.004],
  [REPETITION_PIVOT.z + 0.01, REPETITION_PIVOT.y - 0.003],
];

export const REPETITION_SUPPORT_RECT: Rect = {
  a: [REPETITION_PIVOT.z - 0.0065, REPETITION_PIVOT.z + 0.0065],
  b: [WIPPEN.pivotY + 0.007, REPETITION_PIVOT.y + 0.003],
};

export const SPRING = {
  z: CAPSTAN.z + 0.006,
  bottom: WIPPEN.pivotY + 0.0085,
  top: REPETITION_PIVOT.y,
  radius: 0.0013,
  wire: 0.0003,
  turns: 5,
} as const;

export const REGULATING_RAIL: Rect = { a: [-0.318, HAMMER.pivotZ - 0.001], b: [0.812, 0.822] };
export const HAMMER_RAIL: Rect = { a: [HAMMER.pivotZ - 0.0035, -0.262], b: [0.77, 0.781] };
export const WIPPEN_RAIL: Rect = {
  a: [WIPPEN.pivotZ - 0.008, WIPPEN.pivotZ + 0.008],
  b: [0.729, 0.74],
};

export const LET_OFF_BUTTON_RECT: Rect = {
  a: [LET_OFF_BUTTON.z - 0.004, LET_OFF_BUTTON.z + 0.004],
  b: [LET_OFF_BUTTON.y, LET_OFF_BUTTON.y + 0.006],
};
export const LET_OFF_BUTTON_X = [-0.0072, 0.003] as const;
export const LET_OFF_SCREW_X = -0.006;

export const DROP_SCREW = {
  x: 0.0058,
  z: REPETITION_TIP_Z - 0.001,
  bottom: repetitionTop(REPETITION_TIP_Z) + DROP_GAP,
} as const;

export const SCREW_RADIUS = 0.0009;

export const FLANGE = {
  halfWidth: 0.0035,
  z: [HAMMER.pivotZ - 0.0045, HAMMER.pivotZ + 0.0055] as const,
  y: [HAMMER_RAIL.b[1], HAMMER.pivotY + 0.007] as const,
} as const;

export const WIPPEN_FLANGE = {
  x: [WIPPEN_X[1], WIPPEN_X[1] + 0.003] as const,
  z: [WIPPEN.pivotZ - 0.006, WIPPEN.pivotZ + 0.006] as const,
  y: [WIPPEN_RAIL.b[1], WIPPEN.pivotY + 0.006] as const,
} as const;

export const SHANK_AXIS_Y = HAMMER.pivotY + 0.0015;
export const SHANK_SPAN = { front: 0.004, intoHead: 0.003 } as const;

export const KNUCKLE = {
  z: HAMMER.pivotZ - KNUCKLE_ARM,
  y: JACK_ANCHOR_Y + 0.0045,
  radiusZ: 0.0065,
  radiusY: 0.0045,
  halfWidth: 0.0065,
} as const;

export const MOULDING_BOTTOM = HAMMER.pivotY - 0.008;
export const MOULDING_OVERLAP = 0.004;

export const CAPSTAN_PROFILE: Outline = [
  [0, KEY.top],
  [0.0048, KEY.top],
  [0.0048, KEY.top + 0.0035],
  [0.0034, KEY.top + 0.004],
  [0.0034, CAPSTAN.top - 0.004],
  [0.0039, CAPSTAN.top - 0.003],
  [0.0028, CAPSTAN.top - 0.0006],
  [0, CAPSTAN.top],
];

export const BACK_CHECK_BLOCK = {
  top: BACK_CHECK.y + 0.022,
  height: 0.022,
  depth: 0.007,
  felt: 0.0018,
  halfWidth: 0.005,
  tilt: 0.08,
  clearance: 0.0005,
  wireRadius: 0.0008,
} as const;

export const DAMPER_LEVER = {
  hinge: { y: KEY.top + 0.006, z: -0.488 },
  front: -0.434,
  halfHeight: 0.005,
  halfWidth: 0.004,
} as const;

export const DAMPER_WIRE_ARM = DAMPER.z - DAMPER_LEVER.hinge.z;
export const DAMPER_FELT = 0.008;
export const DAMPER_WIRE_RADIUS = 0.0007;
export const DAMPER_WIRE_FOOT_Y = DAMPER_LEVER.hinge.y + DAMPER_LEVER.halfHeight;

export const DAMPER_GUIDE_RAIL: Rect = {
  a: [DAMPER.z - 0.012, DAMPER.z + 0.012],
  b: [0.842, 0.852],
};
export const DAMPER_LEVER_RAIL: Rect = { a: [-0.499, -0.482], b: [0.712, 0.732] };
