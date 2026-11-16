import { clamp, lerp, smoothstep, toRadians } from '@core/math';
import type { Point } from '../../../ids';
import {
  POUR_BEAKER,
  POUR_S,
  POUR_BEAKER_AREA_CM2,
  SOLUTION_B_ML,
  pourBeakerLevelCm,
} from '../../../model';
import { BEAKER_LOOK, POUR_LOOK } from '../../constants';
import { spoutLip } from '../../geometry/beaker';
import type { BeakerShape } from '../../geometry/beaker';

export const POUR_SHAPE: BeakerShape = {
  innerRadius: POUR_BEAKER.innerRadius,
  glass: POUR_BEAKER.glass,
  height: POUR_BEAKER.height,
  spoutDeg: BEAKER_LOOK.pourSpoutDeg,
};

export interface PourPose {
  readonly base: Point;
  readonly tilt: number;
  readonly surface: number;
  readonly volume: number;
  readonly flow: number;
  readonly rate: number;
  readonly lip: Point;
}

const SLICES = 48;
const SEARCH_STEPS = 32;
const HALF_TURN = Math.PI;
const QUARTER_TURN = Math.PI / 2;
const LEVEL_TILT = 1e-5;
const FLOW_RAMP = 0.06;
const FLOW_TAIL = 0.86;
const RATE_FLOOR = 0.35;

const RADIUS = POUR_BEAKER.innerRadius;
const FLOOR = POUR_BEAKER.glass;
const RIM = POUR_BEAKER.height;
const LOCAL_LIP = spoutLip(POUR_SHAPE);

function discBelow(edge: number): number {
  if (edge <= -RADIUS) return 0;
  if (edge >= RADIUS) return HALF_TURN * RADIUS * RADIUS;
  const segment =
    RADIUS * RADIUS * Math.acos(edge / RADIUS) - edge * Math.sqrt(RADIUS * RADIUS - edge * edge);
  return HALF_TURN * RADIUS * RADIUS - segment;
}

export function volumeBelow(surface: number, tilt: number): number {
  const sin = Math.sin(tilt);
  const cos = Math.cos(tilt);
  const step = (RIM - FLOOR) / SLICES;
  let volume = 0;
  for (let slice = 0; slice < SLICES; slice += 1) {
    const y = FLOOR + (slice + 0.5) * step;
    const height = surface - y * cos;
    const area =
      sin < LEVEL_TILT ? (height > 0 ? HALF_TURN * RADIUS * RADIUS : 0) : discBelow(height / sin);
    volume += area * step;
  }
  return volume;
}

export function rimSurface(tilt: number): number {
  return -RADIUS * Math.sin(tilt) + RIM * Math.cos(tilt);
}

function lowestSurface(tilt: number): number {
  return -RADIUS * Math.sin(tilt) + FLOOR * Math.cos(tilt);
}

export function capacity(tilt: number): number {
  return volumeBelow(rimSurface(tilt), tilt);
}

function bisect(low: number, high: number, rises: (value: number) => boolean): number {
  let from = low;
  let to = high;
  for (let step = 0; step < SEARCH_STEPS; step += 1) {
    const middle = (from + to) / 2;
    if (rises(middle)) to = middle;
    else from = middle;
  }
  return (from + to) / 2;
}

export function surfaceFor(volume: number, tilt: number): number {
  return bisect(lowestSurface(tilt), rimSurface(tilt), (s) => volumeBelow(s, tilt) >= volume);
}

export function tiltFor(volume: number): number {
  return bisect(0, QUARTER_TURN, (tilt) => capacity(tilt) <= volume);
}

const FULL_VOLUME = SOLUTION_B_ML;
const FILL_TILT = tiltFor(FULL_VOLUME);

function rotate([x, y, z]: Point, tilt: number): Point {
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  return [x * cos - y * sin, x * sin + y * cos, z];
}

function tiltWhileFlowing(volume: number, flow: number): number {
  return (
    tiltFor(Math.max(volume, POUR_LOOK.emptyVolume)) +
    toRadians(POUR_LOOK.extraTiltDeg) * smoothstep(flow, FLOW_TAIL, 1)
  );
}

function held(lip: Point, tilt: number, flow: number): PourPose {
  const volume = pourBeakerLevelCm(flow) * POUR_BEAKER_AREA_CM2;
  const [x, y, z] = rotate(LOCAL_LIP, tilt);
  const base: Point = [lip[0] - x, lip[1] - y, lip[2] - z];
  return {
    base,
    tilt,
    surface: base[1] + Math.min(rimSurface(tilt), surfaceFor(volume, tilt)),
    volume,
    flow,
    rate: flowRate(flow),
    lip,
  };
}

function approach(pour: number): PourPose {
  const share = pour / POUR_BEAKER.lipReachedAt;
  const eased = smoothstep(share);
  const fillShare = POUR_LOOK.flowStart / POUR_BEAKER.lipReachedAt;
  const flow = pourShareFlow(pour);
  const volume = pourBeakerLevelCm(flow) * POUR_BEAKER_AREA_CM2;
  const leaning = FILL_TILT * smoothstep(share, POUR_LOOK.tiltStartShare, fillShare);
  const tilt = flow > 0 ? Math.max(leaning, tiltWhileFlowing(volume, flow)) : leaning;
  const [restX, restY, restZ] = POUR_BEAKER.rest;
  const [localX, localY, localZ] = LOCAL_LIP;
  const [lipX, lipY, lipZ] = POUR_BEAKER.lip;
  const lift = POUR_LOOK.arcLift * Math.sin(HALF_TURN * eased);
  const lip: Point = [
    lerp(restX + localX, lipX, eased),
    lerp(restY + localY, lipY, eased) + lift,
    lerp(restZ + localZ, lipZ, eased),
  ];
  return held(lip, tilt, flow);
}

function flowRate(flow: number): number {
  if (flow <= 0 || flow >= 1) return 0;
  const ramp = smoothstep(flow, 0, FLOW_RAMP) * (1 - smoothstep(flow, FLOW_TAIL, 1));
  return ramp * lerp(RATE_FLOOR, 1, Math.sin(HALF_TURN * flow));
}

function pouring(flow: number): PourPose {
  const volume = pourBeakerLevelCm(flow) * POUR_BEAKER_AREA_CM2;
  return held([...POUR_BEAKER.lip], tiltWhileFlowing(volume, flow), flow);
}

export function pourShareFlow(pour: number): number {
  return clamp((pour - POUR_LOOK.flowStart) / (1 - POUR_LOOK.flowStart), 0, 1);
}

function settle(share: number): PourPose {
  const from = pouring(1);
  const eased = smoothstep(share);
  const [restX, restY, restZ] = POUR_BEAKER.rest;
  const lift = POUR_LOOK.arcLift * Math.sin(HALF_TURN * eased) * (1 - eased);
  const base: Point = [
    lerp(from.base[0], restX, eased),
    lerp(from.base[1], restY, smoothstep(share, POUR_LOOK.tiltStartShare, 1)) + lift,
    lerp(from.base[2], restZ, eased),
  ];
  const tilt = lerp(from.tilt, 0, smoothstep(share, 0, 1 - POUR_LOOK.tiltStartShare));
  const lip = rotate(LOCAL_LIP, tilt);
  return {
    base,
    tilt,
    surface: base[1],
    volume: 0,
    flow: 1,
    rate: 0,
    lip: [base[0] + lip[0], base[1] + lip[1], base[2] + lip[2]],
  };
}

export function pourPose(pour: number, seconds: number): PourPose {
  if (pour < POUR_BEAKER.lipReachedAt) return approach(pour);
  const settled = smoothstep(seconds, POUR_S + POUR_LOOK.settleDelay, POUR_S + POUR_LOOK.settleEnd);
  if (pour >= 1 && settled > 0) return settle(settled);
  return pouring(pourShareFlow(pour));
}
