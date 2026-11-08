import { FULL_TURN } from '@core/math';
import type { HarpsichordPose, Point } from '../../../ids';
import {
  HARPSICHORD,
  HARPSICHORD_JACK_RATIO,
  HARPSICHORD_PLUCK_SHARE,
  KEY,
  PLUCK_RELEASE_MM,
  PLUCK_START_MM,
  mm,
} from '../../../model';
import type { Planar } from './shapes';

export const HARPSICHORD_KEY_BACK = HARPSICHORD.offsetZ - HARPSICHORD.keyLength;
export const JACK = {
  z: HARPSICHORD_KEY_BACK + 0.012,
  bottom: KEY.top,
  top: KEY.top + HARPSICHORD.jackHeight,
  halfThickness: 0.0035,
  halfWidth: 0.011,
} as const;
const STRING_RADIUS = 0.0009;
export const STRING = {
  z: JACK.z + JACK.halfThickness + 0.012,
  radius: STRING_RADIUS,
  angle: Math.PI / 4,
  reach: [-0.02, 0.12],
  segments: 24,
} as const;
const PLECTRUM_HALF = 0.0011;
export const PLECTRUM = {
  rootZ: JACK.z + JACK.halfThickness + 0.0005,
  tipZ: STRING.z + 0.006,
  half: PLECTRUM_HALF,
  y: HARPSICHORD.stringY - STRING_RADIUS - mm(PLUCK_START_MM) - PLECTRUM_HALF,
  bend: 0.5,
} as const;
export const DAMPER_BOTTOM = HARPSICHORD.stringY + STRING_RADIUS - mm(PLUCK_START_MM);
export const RING = { peak: 0.005, hz: 3.5 } as const;
export const REGISTER_REACH = 0.03;
export const HARPSICHORD_BACK = JACK.z - REGISTER_REACH;

const FRONT_ARM = (HARPSICHORD.offsetZ - JACK.z) / (1 + HARPSICHORD_JACK_RATIO);
export const PLUCK_SHARE = -STRING.reach[0] / (STRING.reach[1] - STRING.reach[0]);
const PLUCK_TRAVEL = mm(PLUCK_RELEASE_MM - PLUCK_START_MM);

export const KEY_PIVOT: Planar = [KEY.top - KEY.thickness, HARPSICHORD.offsetZ - FRONT_ARM];

export function harpsichordKeyAngle(keyMm: number): number {
  return Math.asin(mm(keyMm) / FRONT_ARM);
}

export function plectrumAngle(bend: number): number {
  return bend * PLECTRUM.bend;
}

export function stringPoint(along: number): Point {
  return [
    along * Math.cos(STRING.angle),
    HARPSICHORD.stringY,
    STRING.z + along * Math.sin(STRING.angle),
  ];
}

export function ringPhase(elapsed: number): number {
  return FULL_TURN * RING.hz * elapsed;
}

function pluckShape(share: number): number {
  return share < PLUCK_SHARE ? share / PLUCK_SHARE : (1 - share) / (1 - PLUCK_SHARE);
}

export function stringLift(share: number, pose: HarpsichordPose, phase: number): number {
  const ring = (RING.peak * pose.stringShare) / HARPSICHORD_PLUCK_SHARE;
  return (
    pose.plectrumBend * PLUCK_TRAVEL * pluckShape(share) +
    ring * Math.sin(Math.PI * share) * Math.cos(phase)
  );
}
