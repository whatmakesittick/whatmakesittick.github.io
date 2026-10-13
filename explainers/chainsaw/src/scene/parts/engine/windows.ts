import { PORT_IDS } from '../../../ids';
import type { PortId } from '../../../ids';
import { CROWN_BOTTOM_Y, PORT_WINDOWS } from '../../../model';
import { CYLINDER, PORT_ANGLES } from '../../constants';

export type AngleRange = readonly [from: number, to: number];

export interface PortWindow {
  port: PortId;
  centreDeg: number;
  halfDeg: number;
  bottom: number;
  top: number;
}

export const BACK_HALF: AngleRange = [180, 360];
export const FRONT_HALF: AngleRange = [0, 180];
export const HALVES = { back: BACK_HALF, front: FRONT_HALF } as const;
export type HalfId = keyof typeof HALVES;
export const HALF_IDS: readonly HalfId[] = ['back', 'front'];

const FULL_DEG = 360;

const HALF_DEG: Readonly<Record<PortId, number>> = {
  exhaust: CYLINDER.exhaustHalfDeg,
  transfer: CYLINDER.transferHalfDeg,
  intake: CYLINDER.intakeHalfDeg,
};

function windowBounds(port: PortId): { bottom: number; top: number } {
  if (port === 'intake') return PORT_WINDOWS.intake;
  return { bottom: CROWN_BOTTOM_Y, top: PORT_WINDOWS[port].top };
}

export const WINDOWS: readonly PortWindow[] = PORT_IDS.flatMap((port) =>
  PORT_ANGLES[port].map((centreDeg) => ({
    port,
    centreDeg,
    halfDeg: HALF_DEG[port],
    ...windowBounds(port),
  })),
);

export function angularRanges(centreDeg: number, halfDeg: number): AngleRange[] {
  const from = centreDeg - halfDeg;
  const to = centreDeg + halfDeg;
  if (from < 0)
    return [
      [from + FULL_DEG, FULL_DEG],
      [0, to],
    ];
  if (to > FULL_DEG)
    return [
      [from, FULL_DEG],
      [0, to - FULL_DEG],
    ];
  return [[from, to]];
}

export function intersect(a: AngleRange, b: AngleRange): AngleRange | null {
  const from = Math.max(a[0], b[0]);
  const to = Math.min(a[1], b[1]);
  return to > from ? [from, to] : null;
}

export function subtract(ranges: readonly AngleRange[], cut: AngleRange): AngleRange[] {
  return ranges.flatMap(([from, to]): AngleRange[] => {
    if (cut[1] <= from || cut[0] >= to) return [[from, to]];
    const pieces: AngleRange[] = [];
    if (cut[0] > from) pieces.push([from, cut[0]]);
    if (cut[1] < to) pieces.push([cut[1], to]);
    return pieces;
  });
}

export function openRanges(half: AngleRange, cuts: readonly AngleRange[]): AngleRange[] {
  return cuts.reduce<AngleRange[]>((ranges, cut) => subtract(ranges, cut), [half]);
}
