import { clamp, lerp, smoothstep } from '@core/math';
import { EJECTOR_X, FREE_TRAVEL } from '../../model/layout';
import type { Point } from '../../model/scale';
import {
  CASE_FLIGHT,
  FEED_PATH,
  MAGAZINE_ARC,
  MAGAZINE_SHAPE,
  MAGAZINE_STACK,
  SHEET,
  magazinePoint,
} from '../constants';

export interface RoundPose {
  base: Point;
  tilt: number;
}

export interface FeedPose extends RoundPose {
  chambered: boolean;
}

export interface CasePose {
  base: Point;
  yaw: number;
  roll: number;
}

const ROUND_RADIUS = 5.65;
const FULL_TURN = Math.PI * 2;

export function boltTravel(carrier: number): number {
  return Math.max(0, carrier - FREE_TRAVEL);
}

export function stackCount(): number {
  const { radius, sweep } = MAGAZINE_ARC;
  const { firstArc, pitch, follower } = MAGAZINE_STACK;
  const reach = radius * sweep - MAGAZINE_SHAPE.floor - follower - ROUND_RADIUS;
  return Math.floor((reach - firstArc) / pitch) + 1;
}

export function stackArc(index: number): number {
  return MAGAZINE_STACK.firstArc + index * MAGAZINE_STACK.pitch;
}

export function stackPose(index: number): RoundPose {
  const angle = stackArc(index) / MAGAZINE_ARC.radius;
  const [x, y] = magazinePoint(MAGAZINE_ARC.rear - SHEET - MAGAZINE_STACK.baseInset, angle);
  const side = index % 2 === 0 ? MAGAZINE_STACK.topSide : -MAGAZINE_STACK.topSide;
  return { base: [x, y, side * MAGAZINE_STACK.column], tilt: angle };
}

export function feedPose(feed: number, carrier: number): FeedPose {
  const start = stackPose(0);
  const [startX, startY, startZ] = start.base;
  if (feed <= 0) return { ...start, chambered: false };
  const face = -boltTravel(carrier);
  const baseX = feed >= 1 ? 0 : clamp(face, startX, 0);
  const progress = (baseX - startX) / -startX;
  const eased = smoothstep(progress);
  return {
    base: [baseX, lerp(startY, 0, eased), lerp(startZ, 0, eased)],
    tilt: lerp(start.tilt, 0, eased) + FEED_PATH.tilt * Math.sin(Math.PI * progress),
    chambered: progress >= 1,
  };
}

function riseCoefficients(): readonly [number, number] {
  const { rise, drop } = CASE_FLIGHT;
  const linear = 2 * rise + 2 * Math.sqrt(rise * rise - rise * drop);
  return [linear, drop - linear];
}

export function casePose(flight: number): CasePose {
  const { forward, right, turns, roll } = CASE_FLIGHT;
  const u = clamp(flight, 0, 1);
  const [linear, square] = riseCoefficients();
  const sideways = 1 - (1 - u) ** 2;
  return {
    base: [EJECTOR_X + forward * u, linear * u + square * u * u, right * sideways],
    yaw: -turns * FULL_TURN * u,
    roll: roll * u,
  };
}
