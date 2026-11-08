import type { Point } from '../../../ids';
import { STRING_RADIUS } from './constants';
import { bridgeOf } from './bridgePlan';
import type { PianoString } from './layout';
import { pointAlong } from './layout';
import { plan, polylineHit } from './planMath';

export function radiusOf(string: PianoString): number {
  if (string.band === 'bass') return STRING_RADIUS.core;
  return string.band === 'tenor' ? STRING_RADIUS.tenor : STRING_RADIUS.steel;
}

export function bridgeTop(string: PianoString): number {
  return string.y - radiusOf(string);
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b[0] - a[0], b[2] - a[2]);
}

export function speakingEnd(string: PianoString): Point {
  const hit = polylineHit(bridgeOf(string.key).front, plan(string.front), plan(string.direction));
  if (!hit) return string.back;
  const reach = Math.min(
    distance(string.front, string.back),
    distance(string.front, [hit.point.x, 0, hit.point.z]),
  );
  return pointAlong(string.front, string.direction, reach);
}
