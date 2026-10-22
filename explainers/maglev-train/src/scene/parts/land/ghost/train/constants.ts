import { TRAIN } from '../../../../../model';
import { CONTACT_WIRE_RISE } from '../constants';
import type { BodySection, EndShape, NoseShape } from './section';

export const CONSIST = {
  length: TRAIN.length,
  cars: 8,
  endCar: 21.5,
  gap: 0.45,
} as const;

export const BODY: BodySection = {
  halfWidth: 1.65,
  top: 3.85,
  bottom: 0.32,
  waist: 1.75,
  upper: 2.6,
  lower: 4,
};

export const NOSE: NoseShape = {
  length: 10.5,
  tipY: 0.95,
  frontBottom: 0.22,
  skirtBlend: 0.55,
  width: { power: 1.9, round: 1.9 },
  top: { power: 2, round: 1.25 },
  bottom: { power: 3.5, round: 3.5 },
  tipUpper: 2,
  tipLower: 2.2,
};

export const GROOVE: EndShape & { readonly faceOffsets: readonly number[] } = {
  depth: 0.45,
  narrowing: 0.06,
  roofDrop: 0.1,
  skirtRise: 0.08,
  exponent: 2,
  faceOffsets: [0, 0.1, 0.45],
};

export const LOFT = { ring: 15, noseStations: 16, noseBias: 1.7 } as const;

export const OUTER_SIDE = -1;

export const WINDOW_BAND = { bottom: 1.95, top: 2.6, doorClearance: 0.4 } as const;

export const DOOR = { width: 1.0, bottom: 1.2, top: 3.0, inset: 1.1, edgeSegments: 4 } as const;

export interface NoseMark {
  readonly centre: number;
  readonly halfLength: number;
  readonly theta: number;
  readonly spread: number;
  readonly roundness: number;
  readonly segments: number;
}

export const WINDSCREEN: NoseMark = {
  centre: 0.6,
  halfLength: 0.13,
  theta: 0,
  spread: 0.62,
  roundness: 4,
  segments: 32,
};

export const HEADLIGHT: NoseMark = {
  centre: 0.3,
  halfLength: 0.07,
  theta: 1.8,
  spread: 0.12,
  roundness: 4,
  segments: 16,
};

export const BOGIE = {
  wheelbase: 2.5,
  wheelRadius: 0.43,
  wheelWidth: 0.14,
  wheelSegments: 10,
  axleRadius: 0.08,
  axleSides: 6,
  endInset: 2.5,
  noseInset: 7,
  sideFrame: { halfLength: 1.7, bottom: 0.45, top: 0.75, width: 0.14, offset: 1.0 },
  bolster: { halfLength: 0.25, bottom: 0.5, top: 0.75 },
} as const;

export const PANTOGRAPH = {
  cars: [2, 5],
  raisedCar: 5,
  share: 0.3,
  standoff: 0.3,
  insulatorX: 0.6,
  insulatorZ: 0.45,
  insulatorRadius: 0.05,
  frame: { halfLength: 0.8, halfWidth: 0.55, thickness: 0.1 },
  hingeBack: 0.85,
  lowerArm: 1.85,
  upperArm: 1.75,
  armRadius: { lower: 0.04, upper: 0.03 },
  armSides: 6,
  headBack: 0.75,
  raisedHeadY: CONTACT_WIRE_RISE - 0.03,
  foldedLift: 0.25,
  head: { halfWidth: 0.95, length: 0.08, height: 0.05 },
  horn: { spread: 0.15, drop: 0.15, radius: 0.015, sides: 4 },
} as const;
