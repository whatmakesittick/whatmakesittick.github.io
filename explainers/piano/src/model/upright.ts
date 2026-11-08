import { clamp, smoothstep } from '@core/math';
import type { PedalId, RegisterId, TouchId, UprightPose } from '../ids';
import {
  ACTION_RATIO,
  BLOW_MM,
  DAMPER_LIFT_MAX_MM,
  KEY_DIP_MM,
  PLAYED_KEY,
  UPRIGHT_RESET_SHARE,
  UPRIGHT_SOFT_SHARE,
} from './constants';
import { hammerAt, keyMmAt, pressEscape } from './action';
import { hasDamper } from './layout';
import { STROKES, inRelease } from './timing';

const SPOON_START_SHARE = 0.5;
const SPOON_FULL_SHARE = 0.8;
const RESET_KEY_MM = (1 - UPRIGHT_RESET_SHARE) * KEY_DIP_MM;

export function uprightRestOffsetMm(pedal: PedalId): number {
  return pedal === 'unaCorda' ? UPRIGHT_SOFT_SHARE * BLOW_MM : 0;
}

function grandRise(units: number, touch: TouchId, register: RegisterId, keyMm: number): number {
  if (!inRelease(units)) return hammerAt(units, touch, register).riseMm;
  return Math.min(BLOW_MM - STROKES[touch].checkMm, ACTION_RATIO * keyMm);
}

function uprightEscape(units: number, keyMm: number): number {
  if (!inRelease(units)) return pressEscape(keyMm);
  return clamp(keyMm / RESET_KEY_MM, 0, 1);
}

function uprightDamperLift(pedal: PedalId, register: RegisterId, keyMm: number): number {
  if (!hasDamper(PLAYED_KEY[register])) return 0;
  if (pedal === 'sustain') return DAMPER_LIFT_MAX_MM;
  const spoon = (ACTION_RATIO * keyMm) / BLOW_MM;
  return DAMPER_LIFT_MAX_MM * smoothstep(spoon, SPOON_START_SHARE, SPOON_FULL_SHARE);
}

export function uprightPoseAt(
  units: number,
  touch: TouchId,
  pedal: PedalId,
  register: RegisterId,
): UprightPose {
  const keyMm = keyMmAt(units, touch, register);
  const hammer = hammerAt(units, touch, register);
  const restOffsetMm = uprightRestOffsetMm(pedal);
  const reachShare = (BLOW_MM - restOffsetMm) / BLOW_MM;
  const hammerTravelMm = restOffsetMm + grandRise(units, touch, register, keyMm) * reachShare;
  return {
    keyMm,
    hammerTravelMm,
    hammerToStringMm: Math.max(0, BLOW_MM - hammerTravelMm),
    restOffsetMm,
    contact: hammer.contact,
    jackEscape: uprightEscape(units, keyMm),
    checked: hammer.checked,
    damperLiftMm: uprightDamperLift(pedal, register, keyMm),
  };
}
