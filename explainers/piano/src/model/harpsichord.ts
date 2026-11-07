import { clamp } from '@core/math';
import type { HarpsichordPose, RegisterId, TouchId } from '../ids';
import {
  ACTION_RATIO,
  HARPSICHORD_DECAY_DB_S,
  HARPSICHORD_JACK_RATIO,
  HARPSICHORD_PLUCK_SHARE,
  KEY_DIP_MM,
  PLUCK_RELEASE_MM,
  PLUCK_START_MM,
} from './constants';
import { keyMmAt } from './action';
import { toSeconds } from './scale';
import { KEY_RELEASE_SPEED, STROKES, realMsAt, strokeClock, timeAtDriveRise } from './timing';

const DB_PER_AMPLITUDE_DECADE = 20;

export function pluckMs(touch: TouchId): number {
  const keyAtPluck = PLUCK_RELEASE_MM / HARPSICHORD_JACK_RATIO;
  return timeAtDriveRise(ACTION_RATIO * keyAtPluck, STROKES[touch]);
}

export function harpsichordDampedMs(touch: TouchId, register: RegisterId): number {
  const keyAtDamper = PLUCK_START_MM / HARPSICHORD_JACK_RATIO;
  return strokeClock(touch, register).holdEndMs + (KEY_DIP_MM - keyAtDamper) / KEY_RELEASE_SPEED;
}

function ringShare(sinceMs: number): number {
  const fallDb = HARPSICHORD_DECAY_DB_S * toSeconds(sinceMs);
  return HARPSICHORD_PLUCK_SHARE * 10 ** (-fallDb / DB_PER_AMPLITUDE_DECADE);
}

export function harpsichordPoseAt(
  units: number,
  touch: TouchId,
  register: RegisterId,
): HarpsichordPose {
  const keyMm = keyMmAt(units, touch, register);
  const jackRiseMm = keyMm * HARPSICHORD_JACK_RATIO;
  const ms = realMsAt(units, touch, register);
  const plucksAt = pluckMs(touch);
  const rising = ms < strokeClock(touch, register).holdEndMs;
  const plucked = ms >= plucksAt && ms < harpsichordDampedMs(touch, register);
  const bending = rising && ms < plucksAt;
  return {
    keyMm,
    jackRiseMm,
    plectrumBend: bending
      ? clamp((jackRiseMm - PLUCK_START_MM) / (PLUCK_RELEASE_MM - PLUCK_START_MM), 0, 1)
      : 0,
    plucked,
    damperOn: jackRiseMm < PLUCK_START_MM,
    stringShare: plucked ? ringShare(ms - plucksAt) : 0,
  };
}
