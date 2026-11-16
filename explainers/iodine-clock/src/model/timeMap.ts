import { clamp, smoothstep } from '@core/math';
import { PHASE_IDS } from '../ids';
import type { MomentId, PhaseId } from '../ids';
import { I2_FINAL_M, IODINE_RISE_S, VISIBLE_IODINE_M } from './kinetics';

export interface Span {
  start: number;
  end: number;
}

export const CYCLE_UNITS = 1000;

export const PHASE_RANGES: Readonly<Record<PhaseId, Span>> = {
  pour: { start: 0, end: 60 },
  induction: { start: 60, end: 520 },
  exhaustion: { start: 520, end: 680 },
  iodine: { start: 680, end: 780 },
  complex: { start: 780, end: 880 },
  blue: { start: 880, end: CYCLE_UNITS },
};

export const POUR_S = 1;
export const EXHAUSTION_S = 1;
export const IODINE_S = 0.02;
export const COMPLEX_END_S = 0.4;
export const AFTER_SWITCH_S = 5;

export const STRETCHED_SCREEN_S: Readonly<Partial<Record<PhaseId, number>>> = {
  iodine: 1.5,
  complex: 1.5,
};

export const VISIBLE_DELAY_S = -IODINE_RISE_S * Math.log(1 - VISIBLE_IODINE_M / I2_FINAL_M);

const LAST_PHASE: PhaseId = 'blue';

export function realBounds(switchAt: number): Readonly<Record<PhaseId, Span>> {
  return {
    pour: { start: 0, end: POUR_S },
    induction: { start: POUR_S, end: switchAt - EXHAUSTION_S },
    exhaustion: { start: switchAt - EXHAUSTION_S, end: switchAt },
    iodine: { start: switchAt, end: switchAt + IODINE_S },
    complex: { start: switchAt + IODINE_S, end: switchAt + COMPLEX_END_S },
    blue: { start: switchAt + COMPLEX_END_S, end: switchAt + AFTER_SWITCH_S },
  };
}

export function runEndSeconds(switchAt: number): number {
  return switchAt + AFTER_SWITCH_S;
}

export function phaseIdAt(units: number): PhaseId {
  return PHASE_IDS.find((id) => units < PHASE_RANGES[id].end) ?? LAST_PHASE;
}

function shareOf(value: number, { start, end }: Span): number {
  return clamp((value - start) / (end - start), 0, 1);
}

function at(share: number, { start, end }: Span): number {
  return start + share * (end - start);
}

function lengthOf({ start, end }: Span): number {
  return end - start;
}

export function phaseProgress(units: number): number {
  return shareOf(units, PHASE_RANGES[phaseIdAt(units)]);
}

export function realAt(units: number, switchAt: number): number {
  const id = phaseIdAt(units);
  return at(shareOf(units, PHASE_RANGES[id]), realBounds(switchAt)[id]);
}

export function unitsAt(seconds: number, switchAt: number): number {
  const bounds = realBounds(switchAt);
  const id = PHASE_IDS.find((phase) => seconds < bounds[phase].end) ?? LAST_PHASE;
  return at(shareOf(seconds, bounds[id]), PHASE_RANGES[id]);
}

export function screenSeconds(id: PhaseId, switchAt: number): number {
  return STRETCHED_SCREEN_S[id] ?? lengthOf(realBounds(switchAt)[id]);
}

export function paceAt(units: number, switchAt: number): number {
  const id = phaseIdAt(units);
  return lengthOf(realBounds(switchAt)[id]) / screenSeconds(id, switchAt);
}

export function advanceUnits(units: number, screenDelta: number, switchAt: number): number {
  let position = clamp(units, 0, CYCLE_UNITS);
  let left = screenDelta;
  while (left > 0 && position < CYCLE_UNITS) {
    const id = phaseIdAt(position);
    const range = PHASE_RANGES[id];
    const rate = lengthOf(range) / screenSeconds(id, switchAt);
    const toEnd = (range.end - position) / rate;
    if (left < toEnd) return position + left * rate;
    position = range.end;
    left -= toEnd;
  }
  return position;
}

export function complexShare(units: number): number {
  const { start, end } = PHASE_RANGES.complex;
  return smoothstep(units, start, end);
}

const IODINE_SHARE_OF_VISIBLE = VISIBLE_DELAY_S / IODINE_S;

export const MOMENTS: Readonly<Record<MomentId, number>> = {
  mixed: PHASE_RANGES.pour.end,
  switch: PHASE_RANGES.iodine.start,
  visible: at(IODINE_SHARE_OF_VISIBLE, PHASE_RANGES.iodine),
  deepBlue: PHASE_RANGES.complex.end,
};
