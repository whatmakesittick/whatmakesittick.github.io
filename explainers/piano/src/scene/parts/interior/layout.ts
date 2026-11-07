import { lerp } from '@core/math';
import type { Point } from '../../../ids';
import {
  KEYS,
  STRINGS,
  TUNING_PINS,
  isWound,
  stringDirection,
  stringPath,
  stringPlaneY,
  stringsPerNote,
} from '../../../model';
import { TUNING_PIN } from './constants';

export type Band = 'bass' | 'tenor' | 'treble';

export interface PianoString {
  readonly key: number;
  readonly unison: number;
  readonly order: number;
  readonly band: Band;
  readonly y: number;
  readonly direction: Point;
  readonly pin: Point;
  readonly front: Point;
  readonly back: Point;
  readonly hitch: Point;
}

const FIRST_KEY = 1;
const PIN_NEIGHBOURS = 12;

export function bandOf(key: number): Band {
  if (isWound(key)) return 'bass';
  return key <= STRINGS.tenorTopKey ? 'tenor' : 'treble';
}

export function unisonOffset(key: number, unison: number): number {
  return (unison - (stringsPerNote(key) - 1) / 2) * STRINGS.unisonSpacing;
}

function shifted([x, y, z]: Point, dx: number): Point {
  return [x + dx, y, z];
}

export function pointAlong([x, y, z]: Point, [dx, , dz]: Point, distance: number): Point {
  return [x + dx * distance, y, z + dz * distance];
}

function rowDepth(row: number, frontZ: number): number {
  const deepest = Math.max(TUNING_PINS.backZ, frontZ + TUNING_PIN.clearance);
  return lerp(TUNING_PINS.frontZ, deepest, row / (TUNING_PIN.rows - 1));
}

function pinAt([x, y]: Point, z: number): Point {
  return [x, y, z];
}

function gapTo(pin: Point, placed: readonly Point[]): number {
  return placed.reduce(
    (nearest, other) => Math.min(nearest, Math.hypot(pin[0] - other[0], pin[2] - other[2])),
    Infinity,
  );
}

function placePin(front: Point, order: number, placed: readonly Point[]): Point {
  const candidates = Array.from({ length: TUNING_PIN.rows }, (_, step) =>
    pinAt(front, rowDepth((order + step) % TUNING_PIN.rows, front[2])),
  );
  const nearby = placed.slice(-PIN_NEIGHBOURS);
  return (
    candidates.find((pin) => gapTo(pin, nearby) >= TUNING_PIN.spacing) ??
    candidates.reduce((best, pin) => (gapTo(pin, nearby) > gapTo(best, nearby) ? pin : best))
  );
}

function keyStrings(key: number, placed: Point[]): PianoString[] {
  const path = stringPath(key);
  const direction = stringDirection(key);
  return Array.from({ length: stringsPerNote(key) }, (_, unison) => {
    const dx = unisonOffset(key, unison);
    const order = placed.length;
    const front = shifted(path.front, dx);
    const pin = placePin(front, order, placed);
    placed.push(pin);
    return {
      key,
      unison,
      order,
      band: bandOf(key),
      y: stringPlaneY(key),
      direction,
      pin,
      front,
      back: shifted(path.back, dx),
      hitch: shifted(path.hitch, dx),
    };
  });
}

function buildStrings(): readonly PianoString[] {
  const strings: PianoString[] = [];
  const placed: Point[] = [];
  for (let key = FIRST_KEY; key <= KEYS; key += 1) strings.push(...keyStrings(key, placed));
  return strings;
}

export const PIANO_STRINGS = buildStrings();

export function unisonOf(key: number): readonly PianoString[] {
  return PIANO_STRINGS.filter((string) => string.key === key);
}

export function stringsIn(band: Band): readonly PianoString[] {
  return PIANO_STRINGS.filter((string) => string.band === band);
}

export function midSpeaking(string: PianoString): Point {
  const [fx, y, fz] = string.front;
  const [bx, , bz] = string.back;
  return [(fx + bx) / 2, y, (fz + bz) / 2];
}
