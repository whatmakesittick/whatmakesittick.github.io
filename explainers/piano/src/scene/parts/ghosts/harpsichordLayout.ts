import { FULL_TURN } from '@core/math';
import type { HarpsichordPose } from '../../../ids';
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
  halfDepth: 0.0065,
  halfWidth: 0.0025,
} as const;
export const STRING = {
  x: 0.007,
  radius: 0.0008,
  front: JACK.z + 0.06,
  back: JACK.z - 0.15,
  segments: 40,
} as const;
export const PLECTRUM = {
  rootX: JACK.halfWidth + 0.0005,
  tipX: STRING.x + 0.0045,
  half: 0.0004,
  y: HARPSICHORD.stringY - STRING.radius - mm(PLUCK_START_MM) - 0.0004,
  bend: 0.5,
} as const;
export const DAMPER_BOTTOM = HARPSICHORD.stringY + STRING.radius - mm(PLUCK_START_MM);
export const RING = { peak: 0.005, hz: 3.5 } as const;

const FRONT_ARM = (HARPSICHORD.offsetZ - JACK.z) / (1 + HARPSICHORD_JACK_RATIO);
const PLUCK_SHARE = (JACK.z - STRING.back) / (STRING.front - STRING.back);
const PLUCK_TRAVEL = mm(PLUCK_RELEASE_MM - PLUCK_START_MM);

export const KEY_PIVOT: Planar = [KEY.top - KEY.thickness, HARPSICHORD.offsetZ - FRONT_ARM];

export function harpsichordKeyAngle(keyMm: number): number {
  return Math.asin(mm(keyMm) / FRONT_ARM);
}

export function plectrumAngle(bend: number): number {
  return -bend * PLECTRUM.bend;
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
