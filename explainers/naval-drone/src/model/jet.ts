import { clamp, toRadians } from '@core/math';
import type { HelmId, JetReading } from '../ids';
import { valueAt } from './keyframes';
import type { Keyframes } from './keyframes';
import { BOAT } from './layout';
import { SEAWATER_DENSITY, knotsToMs } from './scale';

export const NOZZLE_AREA = 0.0064;
export const NEWTONS_PER_KILONEWTON = 1000;
export const MAX_RPM = 8000;
export const STEER_MAX = toRadians(27);

export const RESISTANCE_KEYS_KN: Keyframes = [
  [0, 0],
  [4, 0.25],
  [5.7, 0.5],
  [8, 1],
  [11, 1.45],
  [15, 1.6],
  [22, 1.65],
  [30, 1.9],
  [42, 2.3],
];

const FLOW_PER_JET_SPEED = SEAWATER_DENSITY * NOZZLE_AREA;
const QUADRATIC_FOUR = 4;
const IDEAL_EFFICIENCY_NUMERATOR = 2;
const BISECTION_STEPS = 48;

const HELM_NOZZLE: Readonly<Record<HelmId, number>> = {
  left: -STEER_MAX,
  straight: 0,
  right: STEER_MAX,
  reverse: 0,
};

function boatKnots(knots: number): number {
  return clamp(knots, 0, BOAT.topKnots);
}

export function resistanceAt(knots: number): number {
  return valueAt(RESISTANCE_KEYS_KN, boatKnots(knots)) * NEWTONS_PER_KILONEWTON;
}

export function steadyJetSpeedAt(knots: number): number {
  const inflow = knotsToMs(boatKnots(knots));
  const pressure = (QUADRATIC_FOUR * resistanceAt(knots)) / FLOW_PER_JET_SPEED;
  return (inflow + Math.sqrt(inflow * inflow + pressure)) / 2;
}

export function steadyFlowAt(knots: number): number {
  return FLOW_PER_JET_SPEED * steadyJetSpeedAt(knots);
}

export const TOP_FLOW = steadyFlowAt(BOAT.topKnots);

export function throttleAt(knots: number): number {
  return clamp(steadyFlowAt(knots) / TOP_FLOW, 0, 1);
}

export function knotsAtThrottle(share: number): number {
  const target = clamp(share, 0, 1);
  let low = 0;
  let high: number = BOAT.topKnots;
  for (let step = 0; step < BISECTION_STEPS; step += 1) {
    const middle = (low + high) / 2;
    if (throttleAt(middle) < target) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

export function helmNozzle(helm: HelmId): number {
  return HELM_NOZZLE[helm];
}

export function idealEfficiency(jetSpeed: number, inflow: number): number {
  if (inflow <= 0 || jetSpeed <= 0) return 0;
  return IDEAL_EFFICIENCY_NUMERATOR / (1 + jetSpeed / inflow);
}

export function jetAt(
  throttle: number,
  knots: number,
  nozzleAngle: number,
  reverse: boolean,
): JetReading {
  const share = clamp(throttle, 0, 1);
  const flow = share * TOP_FLOW;
  const jetSpeed = flow / FLOW_PER_JET_SPEED;
  const inflow = knotsToMs(boatKnots(knots));
  return {
    throttle: share,
    flow,
    jetSpeed,
    thrust: reverse ? 0 : flow * (jetSpeed - inflow),
    efficiency: reverse ? 0 : idealEfficiency(jetSpeed, inflow),
    impellerShare: share,
    nozzleAngle: clamp(nozzleAngle, -STEER_MAX, STEER_MAX),
    bucket: reverse ? 1 : 0,
  };
}
