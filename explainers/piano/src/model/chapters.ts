import { COMPARE_IDS } from '../ids';
import type { CompareId, PedalId, RegisterId, TouchId } from '../ids';
import {
  ACTION_RATIO,
  DAMPER_LEAVE_KEY_MM,
  GRAVITY,
  HAMMER_SPEED_MS,
  STRIKE_MS,
} from './constants';
import { metresPerSecond } from './scale';
import { STROKES, timeAtDriveRise } from './timing';
import { STRETCH_PARTIAL, centsSharp, t60For } from './tone';

export const COMPARE_ROW_IDS = ['move', 'return', 'touch'] as const;
export type CompareRowId = (typeof COMPARE_ROW_IDS)[number];

const CM_PER_M = 100;

export function touchTimeMs(touch: TouchId): number {
  return STRIKE_MS[touch];
}

export function dropHeightCm(touch: TouchId): number {
  const speed = HAMMER_SPEED_MS[touch];
  return (CM_PER_M * speed * speed) / (2 * GRAVITY);
}

export function keySpeedAtLetOff(touch: TouchId): number {
  return metresPerSecond(STROKES[touch].speed / ACTION_RATIO);
}

export function freeFlightMs(touch: TouchId): number {
  return STROKES[touch].flightMs;
}

export function damperLeadMs(touch: TouchId): number {
  const stroke = STROKES[touch];
  return stroke.strikeMs - timeAtDriveRise(ACTION_RATIO * DAMPER_LEAVE_KEY_MM, stroke);
}

export function stretchCents(register: RegisterId): number {
  return centsSharp(STRETCH_PARTIAL[register], register);
}

export function decaySeconds(pedal: PedalId, register: RegisterId): number {
  return t60For(pedal, register);
}

function compareRow(row: CompareRowId): Record<CompareId, string> {
  return Object.fromEntries(
    COMPARE_IDS.map((id) => [id, `chapters.compare.${row}Value.${id}`]),
  ) as Record<CompareId, string>;
}

export const COMPARE: Readonly<Record<CompareRowId, Readonly<Record<CompareId, string>>>> =
  Object.fromEntries(COMPARE_ROW_IDS.map((row) => [row, compareRow(row)])) as Record<
    CompareRowId,
    Record<CompareId, string>
  >;
