import { lerp, toRadians } from '@core/math';
import type { ActionPose, Point } from '../../../ids';
import {
  BACK_CHECK,
  DAMPER,
  DAMPER_LEAVE_KEY_MM,
  DAMPER_LIFT_MAX_MM,
  DAMPER_RATIO,
  HAMMER,
  HAMMER_MASS_G,
  KEYS,
  PLAYED_KEY,
  SHANK,
  STRIKE_Z,
  STRINGS,
  STRING_Y,
  fanDegrees,
  keyX,
  mm,
  stringPlaneY,
  stringsPerNote,
} from '../../../model';
import { hammerAngle, jackAngle, keyAngle, repetitionAngle, wippenAngle } from '../../pose';
import {
  DAMPER_FELT,
  DAMPER_WIRE_ARM,
  DAMPER_WIRE_RADIUS,
  MOULDING_BOTTOM,
  MOULDING_OVERLAP,
  REPETITION_PIVOT,
  SPRING,
} from './dimensions';

const REFERENCE_KEY = PLAYED_KEY.middle;
const FELT_HEIGHT = 0.024;
const HEAD_STRING_SPARE = 0.5;
const MIN_HEAD_STRINGS = 1.5;
const MOULDING_WIDTH_SHARE = 0.85;
const SHANK_RADIUS = 0.0026;
const SHANK_TO_HEAD = 0.42;
const MIN_DAMPER_STRINGS = 2;
const DAMPER_MARGIN = 0.002;
const SQUASH_DRAWN = 2.5;

const SPRING_ARM = SPRING.z - REPETITION_PIVOT.z;
const SPRING_LENGTH = SPRING.top - SPRING.bottom;

export const DAMPER_BLOCK = DAMPER.headHeight - DAMPER_FELT;

export function hammerMassG(key: number): number {
  return lerp(HAMMER_MASS_G.bass, HAMMER_MASS_G.treble, (key - 1) / (KEYS - 1));
}

function headScale(key: number): number {
  return Math.sqrt(hammerMassG(key) / hammerMassG(REFERENCE_KEY));
}

export interface HeadSize {
  width: number;
  depth: number;
  top: number;
  feltHeight: number;
  feltBase: number;
  mouldingWidth: number;
  mouldingHeight: number;
  shankRadius: number;
  centreZ: number;
}

export function headSize(key: number): HeadSize {
  const scale = headScale(key);
  const width =
    Math.max(stringsPerNote(key) - HEAD_STRING_SPARE, MIN_HEAD_STRINGS) * STRINGS.unisonSpacing;
  const top = HAMMER.pivotY + HAMMER.headTopRise + stringPlaneY(key) - STRING_Y;
  const feltHeight = FELT_HEIGHT * scale;
  const feltBase = top - feltHeight;
  return {
    width,
    depth: HAMMER.headDepth * scale,
    top,
    feltHeight,
    feltBase,
    mouldingWidth: width * MOULDING_WIDTH_SHARE,
    mouldingHeight: feltBase + MOULDING_OVERLAP - MOULDING_BOTTOM,
    shankRadius: Math.min(SHANK_RADIUS, width * SHANK_TO_HEAD),
    centreZ: HAMMER.pivotZ - SHANK,
  };
}

export function backCheckFaceZ(key: number): number {
  return BACK_CHECK.z - (headSize(key).depth - HAMMER.headDepth) / 2;
}

export interface DamperHead {
  x: number;
  y: number;
  yaw: number;
  width: number;
}

export function damperHead(key: number): DamperHead {
  const angle = toRadians(fanDegrees(key));
  return {
    x: keyX(key) + (STRIKE_Z - DAMPER.z) * Math.tan(angle),
    y: stringPlaneY(key),
    yaw: -angle,
    width:
      Math.max(stringsPerNote(key), MIN_DAMPER_STRINGS) * STRINGS.unisonSpacing + DAMPER_MARGIN,
  };
}

export function damperWireTop(head: DamperHead): Point {
  const side = head.width / 2 + DAMPER_WIRE_RADIUS;
  return [
    head.x + side * Math.cos(head.yaw),
    head.y + DAMPER_FELT + DAMPER_BLOCK / 2,
    DAMPER.z - side * Math.sin(head.yaw),
  ];
}

export function damperLiftMm(keyMm: number, pedalShare: number): number {
  const keyLift = DAMPER_RATIO * Math.max(0, keyMm - DAMPER_LEAVE_KEY_MM);
  return Math.min(DAMPER_LIFT_MAX_MM, Math.max(keyLift, pedalShare * DAMPER_LIFT_MAX_MM));
}

export interface DetailedPose {
  key: number;
  wippen: number;
  jack: number;
  repetition: number;
  hammer: number;
  feltSquash: number;
  damperLift: number;
  damperLever: number;
  springScale: number;
}

export function detailedPose(action: ActionPose, pedalShare: number): DetailedPose {
  const squashMm = action.feltSquashMm * SQUASH_DRAWN;
  const repetition = -repetitionAngle(action.repetitionLift);
  const damperLift = mm(damperLiftMm(action.keyMm, pedalShare));
  return {
    key: keyAngle(action.keyMm),
    wippen: wippenAngle(action.keyMm),
    jack: -jackAngle(action.jackEscape),
    repetition,
    hammer: hammerAngle(action.hammerRiseMm + squashMm),
    feltSquash: mm(squashMm),
    damperLift,
    damperLever: -Math.asin(damperLift / DAMPER_WIRE_ARM),
    springScale: 1 - (SPRING_ARM * Math.sin(repetition)) / SPRING_LENGTH,
  };
}
