import { Vector2 } from 'three';
import type { LatheArc } from '@core/scene/geometry/lathe';
import { halfArc } from '../fab/shapes';
import type { Side } from '../fab/shapes';
import {
  BODY_END,
  BODY_START,
  COLLECTOR_APEX_X,
  COLLECTOR_AXIAL,
  COLLECTOR_RIM_R,
  COLLECTOR_RIM_X,
  END_X,
  HEAD_DEPTH,
  HEAD_STEPS,
  NECK_R,
  NECK_START,
  PORT_R,
  SHELL_R,
  WINDOW,
} from './dims';

const COLLECTOR_STEPS = 14;
const QUARTER = Math.PI / 2;

export interface ShellPiece {
  profile: Vector2[];
  arc: LatheArc;
}

export function vesselProfile(inset = 0): Vector2[] {
  const head = Array.from({ length: HEAD_STEPS + 1 }, (_, index) => {
    const radius = PORT_R + ((SHELL_R - PORT_R) * index) / HEAD_STEPS;
    const depth = HEAD_DEPTH * Math.sqrt(1 - (radius / SHELL_R) ** 2);
    return new Vector2(radius - inset, BODY_START - depth);
  });
  return [
    ...head,
    new Vector2(SHELL_R - inset, BODY_END),
    new Vector2(NECK_R - inset, NECK_START),
    new Vector2(NECK_R - inset, END_X),
  ];
}

export function collectorProfile(shift = 0): Vector2[] {
  const start = Math.acos(Math.abs(COLLECTOR_APEX_X - COLLECTOR_RIM_X) / COLLECTOR_AXIAL);
  return Array.from({ length: COLLECTOR_STEPS + 1 }, (_, index) => {
    const angle = start + ((QUARTER - start) * index) / COLLECTOR_STEPS;
    const x = COLLECTOR_RIM_X - COLLECTOR_AXIAL * Math.cos(angle);
    return new Vector2(COLLECTOR_RIM_R * Math.sin(angle), x + shift);
  });
}

export function radiusAt(profile: readonly Vector2[], x: number): number {
  for (let index = 1; index < profile.length; index += 1) {
    const [before, after] = [profile[index - 1], profile[index]];
    if (x <= after.y) {
      const share = (x - before.y) / (after.y - before.y);
      return before.x + (after.x - before.x) * share;
    }
  }
  return profile[profile.length - 1].x;
}

export function slice(profile: readonly Vector2[], from: number, to: number): Vector2[] {
  const inside = profile.filter((point) => point.y > from && point.y < to);
  return [
    new Vector2(radiusAt(profile, from), from),
    ...inside,
    new Vector2(radiusAt(profile, to), to),
  ];
}

export function sections(profile: readonly Vector2[], side: Side, trim = 0): ShellPiece[] {
  const [first, last] = [profile[0].y, profile[profile.length - 1].y];
  const whole = halfArc(side, trim);
  if (side === 'back') return [{ profile: [...profile], arc: whole }];
  const { x0, x1, half } = WINDOW;
  const edge = whole.start + whole.length;
  const gap = Math.PI / 2 - half;
  return [
    { profile: slice(profile, first, x0), arc: whole },
    { profile: slice(profile, x0, x1), arc: { start: whole.start, length: gap - trim } },
    { profile: slice(profile, x0, x1), arc: { start: half, length: edge - half } },
    { profile: slice(profile, x1, last), arc: whole },
  ];
}
