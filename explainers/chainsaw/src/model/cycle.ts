import { clamp, toRadians } from '@core/math';
import { PHASE_IDS } from '../ids';
import type { FlowReading, MomentId, PhaseId, PlanePoint, PortId, PortReading } from '../ids';
import { CRANK_Y, ENGINE_GEOMETRY } from './scale';

export const CYCLE_DEG = 360;
export const HALF_TURN_DEG = 180;
const PERCENT = 100;

export const PORT_TIMING: Readonly<Record<PortId, readonly [open: number, close: number]>> = {
  exhaust: [100, 260],
  transfer: [120, 240],
  intake: [290, 70],
};

export const SPARK_DEG = 340;
export const SPARK_FLASH_DEG = 12;

export const PHASE_RANGES: Readonly<Record<PhaseId, readonly [start: number, end: number]>> = {
  power: [0, PORT_TIMING.exhaust[0]],
  exhaust: [PORT_TIMING.exhaust[0], PORT_TIMING.transfer[0]],
  scavenge: [PORT_TIMING.transfer[0], PORT_TIMING.exhaust[1]],
  compression: [PORT_TIMING.exhaust[1], CYCLE_DEG],
};

export const MOMENTS: Readonly<Record<MomentId, number>> = {
  topDeadCentre: 0,
  intakeCloses: PORT_TIMING.intake[1],
  exhaustOpens: PORT_TIMING.exhaust[0],
  transfersOpen: PORT_TIMING.transfer[0],
  bottomDeadCentre: HALF_TURN_DEG,
  transfersClose: PORT_TIMING.transfer[1],
  exhaustCloses: PORT_TIMING.exhaust[1],
  intakeOpens: PORT_TIMING.intake[0],
  spark: SPARK_DEG,
};

export function wrapDegrees(angle: number): number {
  return ((angle % CYCLE_DEG) + CYCLE_DEG) % CYCLE_DEG;
}

export function shortestDelta(from: number, to: number): number {
  const delta = wrapDegrees(to - from);
  return delta > HALF_TURN_DEG ? delta - CYCLE_DEG : delta;
}

export function turnPercent(angle: number): number {
  return (wrapDegrees(angle) / CYCLE_DEG) * PERCENT;
}

export function phaseOf(angle: number): PhaseId {
  const wrapped = wrapDegrees(angle);
  return PHASE_IDS.find((id) => wrapped < PHASE_RANGES[id][1]) ?? PHASE_IDS[PHASE_IDS.length - 1];
}

export function crankPin(angle: number): PlanePoint {
  const radians = toRadians(angle);
  const { throw: crankThrow } = ENGINE_GEOMETRY;
  return [crankThrow * Math.sin(radians), CRANK_Y + crankThrow * Math.cos(radians)];
}

export function rodAngle(angle: number): number {
  const [pinX] = crankPin(angle);
  return Math.asin(-pinX / ENGINE_GEOMETRY.rod);
}

function pistonPinY(angle: number): number {
  const [pinX, pinY] = crankPin(angle);
  return pinY + Math.sqrt(ENGINE_GEOMETRY.rod ** 2 - pinX ** 2);
}

export function crownY(angle: number): number {
  return pistonPinY(angle) + ENGINE_GEOMETRY.pinToCrown;
}

export function skirtY(angle: number): number {
  return crownY(angle) - ENGINE_GEOMETRY.pistonLength;
}

export const CROWN_TOP_Y = crownY(MOMENTS.topDeadCentre);
export const CROWN_BOTTOM_Y = crownY(MOMENTS.bottomDeadCentre);

export function pistonTravel(angle: number): number {
  return (CROWN_TOP_Y - crownY(angle)) / (CROWN_TOP_Y - CROWN_BOTTOM_Y);
}

export interface PortWindow {
  bottom: number;
  top: number;
}

function wallWindow(port: Exclude<PortId, 'intake'>): PortWindow {
  return { bottom: CROWN_BOTTOM_Y, top: crownY(PORT_TIMING[port][0]) };
}

export const PORT_WINDOWS: Readonly<Record<PortId, PortWindow>> = {
  exhaust: wallWindow('exhaust'),
  transfer: wallWindow('transfer'),
  intake: { bottom: skirtY(PORT_TIMING.intake[0]), top: skirtY(MOMENTS.topDeadCentre) },
};

export function portOpenShare(port: PortId, angle: number): number {
  const { bottom, top } = PORT_WINDOWS[port];
  const height = top - bottom;
  if (port === 'intake') return clamp((skirtY(angle) - bottom) / height, 0, 1);
  return clamp((top - crownY(angle)) / height, 0, 1);
}

export function portsAt(angle: number): PortReading {
  return {
    exhaust: portOpenShare('exhaust', angle),
    transfer: portOpenShare('transfer', angle),
    intake: portOpenShare('intake', angle),
  };
}

export function crankcasePressure(angle: number): number {
  return -Math.cos(toRadians(angle));
}

const BURN_SPAN_DEG = wrapDegrees(PORT_TIMING.exhaust[0] - SPARK_DEG);

export function burnShare(angle: number): number {
  const sinceSpark = wrapDegrees(angle - SPARK_DEG);
  return sinceSpark < BURN_SPAN_DEG ? 1 - sinceSpark / BURN_SPAN_DEG : 0;
}

export function sparkGlow(angle: number): number {
  return wrapDegrees(angle - SPARK_DEG) < SPARK_FLASH_DEG ? 1 : 0;
}

export function flowsAt(angle: number): FlowReading {
  return { ...portsAt(angle), burn: burnShare(angle) };
}
