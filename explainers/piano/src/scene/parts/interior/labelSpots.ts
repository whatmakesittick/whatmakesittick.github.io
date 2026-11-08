import { lerp } from '@core/math';
import type { Point } from '../../../ids';
import { KEYS, PLATE, SOUNDBOARD, STRINGS, cutX, isWound, stringPath } from '../../../model';
import { TUNING_PIN } from './constants';
import { midSpeaking, pointAlong, unisonOf } from './layout';
import type { PianoString } from './layout';
import { distance, speakingEnd } from './stringEnds';

const CUT_CLEARANCE = 0.004;
const BOARD_SHARE = 0.6;
const BOARD_EDGE_CLEARANCE = 0.01;
const PLATE_BEFORE_FRONT = 0.023;
const BASS_SHARE = 0.45;
const BASS_CLEARANCE = 0.01;
const BASS_SHORT_OF_BRIDGE = 0.04;
const STRIKE_LABEL_BACK = 0.03;

export function middleOf(key: number): PianoString {
  const unison = unisonOf(key);
  return unison[Math.floor(unison.length / 2)];
}

export function stringSpot(key: number): Point {
  return midSpeaking(middleOf(key));
}

export function strikeSpot(key: number): Point {
  const [x, y, z] = stringPath(key).strike;
  return [x, y, z - STRIKE_LABEL_BACK];
}

export function soundboardSpot(key: number): Point {
  const { front, back } = middleOf(key);
  const z = Math.min(
    lerp(front[2], back[2], BOARD_SHARE),
    SOUNDBOARD.bellyRailZ - BOARD_EDGE_CLEARANCE,
  );
  return [cutX(key) + CUT_CLEARANCE, SOUNDBOARD.topY, z];
}

export function plateSpot(key: number): Point {
  return [cutX(key) + CUT_CLEARANCE, PLATE.topY, middleOf(key).front[2] + PLATE_BEFORE_FRONT];
}

function uncutUnison(key: number): readonly PianoString[] {
  const edge = cutX(key) + CUT_CLEARANCE;
  const keys = Array.from({ length: KEYS - key + 1 }, (_, step) => key + step);
  const found = keys.find((next) => unisonOf(next).every(({ pin }) => pin[0] > edge));
  return unisonOf(found ?? key);
}

export function tuningPinSpot(key: number): Point {
  const deepest = uncutUnison(key).reduce((best, string) =>
    string.pin[2] < best.pin[2] ? string : best,
  );
  return [deepest.pin[0], TUNING_PIN.top, deepest.pin[2]];
}

export function bassSpot(key: number): Point | null {
  const top = middleOf(STRINGS.bassTopKey);
  const reach = distance(top.front, speakingEnd(top));
  const wound = isWound(key);
  const along = wound ? reach * BASS_SHARE : reach - BASS_SHORT_OF_BRIDGE;
  const spot = pointAlong(top.front, top.direction, along);
  return wound || spot[0] > cutX(key) + BASS_CLEARANCE ? spot : null;
}
