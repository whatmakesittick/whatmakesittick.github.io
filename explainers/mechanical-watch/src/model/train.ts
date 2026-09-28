import type { WheelId } from '../ids';
import { WHEEL_IDS } from '../ids';

export interface WheelSpec {
  readonly id: WheelId;
  readonly teeth: number;
  readonly radiusMm: number;
  readonly pinionLeaves: number;
  readonly pinionRadiusMm: number;
  readonly sense: 1 | -1;
}

export const ESCAPE_TEETH = 20;
export const BEATS_PER_TOOTH = 2;
export const BEATS_PER_HOUR = 28_800;
export const OSCILLATIONS_PER_SECOND = BEATS_PER_HOUR / BEATS_PER_TOOTH / 3600;
export const OSCILLATION_PERIOD_S = 1 / OSCILLATIONS_PER_SECOND;
export const POWER_RESERVE_HOURS = 42;
export const BARREL_HOURS_PER_TURN = 8;
export const ARBOR_TURNS_FULL_WIND = POWER_RESERVE_HOURS / BARREL_HOURS_PER_TURN;

const NO_PINION = 0;

export const TRAIN: readonly WheelSpec[] = [
  { id: 'barrel', teeth: 80, radiusMm: 6.0, pinionLeaves: NO_PINION, pinionRadiusMm: 0, sense: -1 },
  { id: 'centreWheel', teeth: 80, radiusMm: 3.6, pinionLeaves: 10, pinionRadiusMm: 0.75, sense: 1 },
  { id: 'thirdWheel', teeth: 75, radiusMm: 3.0, pinionLeaves: 10, pinionRadiusMm: 0.45, sense: -1 },
  { id: 'fourthWheel', teeth: 96, radiusMm: 3.36, pinionLeaves: 10, pinionRadiusMm: 0.4, sense: 1 },
  {
    id: 'escapeWheel',
    teeth: ESCAPE_TEETH,
    radiusMm: 2.425,
    pinionLeaves: 8,
    pinionRadiusMm: 0.28,
    sense: -1,
  },
];

export const MOTION_WORKS = {
  cannonPinion: { leaves: 10, radiusMm: 0.6 },
  minuteWheel: { teeth: 30, radiusMm: 1.8, pinionLeaves: 8, pinionRadiusMm: 0.48 },
  hourWheel: { teeth: 32, radiusMm: 1.92 },
} as const;

export const WINDING = {
  ratchetTeeth: 60,
  ratchetRadiusMm: 4.5,
  crownWheelTeeth: 30,
  crownWheelRadiusMm: 2.25,
  windingPinionLeaves: 12,
  windingPinionRadiusMm: 0.9,
} as const;

export const MAINSPRING_BLADE = {
  lengthMm: 420,
  thicknessMm: 0.125,
  heightMm: 1.23,
} as const;

export const MAINSPRING_TORQUE_MNM = {
  fullWind: 11.3,
  after24Hours: 9.1,
  runDown: 5.0,
} as const;

export function crownTurnsForFullWind(): number {
  const crownWheelTurns = ARBOR_TURNS_FULL_WIND * (WINDING.ratchetTeeth / WINDING.crownWheelTeeth);
  return crownWheelTurns * (WINDING.crownWheelTeeth / WINDING.windingPinionLeaves);
}

export function wheelSpec(id: WheelId): WheelSpec {
  const spec = TRAIN.find((wheel) => wheel.id === id);
  if (!spec) throw new Error(`Unknown wheel ${id}`);
  return spec;
}

export function wheelIndex(id: WheelId): number {
  return WHEEL_IDS.indexOf(id);
}

export function stepUp(id: WheelId): number {
  const index = wheelIndex(id);
  if (index === 0) return 1;
  return TRAIN[index - 1].teeth / TRAIN[index].pinionLeaves;
}

export function turnsPerHour(id: WheelId): number {
  const centre = wheelIndex('centreWheel');
  const index = wheelIndex(id);
  let turns = 1;
  for (let i = centre + 1; i <= index; i += 1) turns *= stepUp(TRAIN[i].id);
  for (let i = centre; i > index; i -= 1) turns /= stepUp(TRAIN[i].id);
  return turns;
}

export function secondsPerTurn(id: WheelId): number {
  return 3600 / turnsPerHour(id);
}

export function beatsPerHour(): number {
  return turnsPerHour('escapeWheel') * ESCAPE_TEETH * BEATS_PER_TOOTH;
}

export function motionWorksRatio(): number {
  const { cannonPinion, minuteWheel, hourWheel } = MOTION_WORKS;
  return (minuteWheel.teeth / cannonPinion.leaves) * (hourWheel.teeth / minuteWheel.pinionLeaves);
}

export function barrelHoursPerTurn(): number {
  return 1 / turnsPerHour('barrel');
}
