import { clamp, lerp } from '@core/math';
import { slowMotionFactor } from '@core/playback';
import { PHASE_IDS, REGISTER_IDS, TOUCH_IDS } from '../ids';
import type { MomentId, PhaseId, RegisterId, TouchId } from '../ids';
import {
  ACTION_RATIO,
  BLOW_MM,
  CHECK_MM,
  CONTACT_MS,
  CONTACT_TOUCH_FACTOR,
  DAMPER_LEAVE_KEY_MM,
  HAMMER_SPEED_MS,
  HOLD_MS,
  JACK_LEAD_MM,
  KEY_DIP_MM,
  LET_OFF_MM,
  REBOUND_SHARE,
  RELEASE_MS,
  REPEAT_RISE_SHARE,
  STRIKE_MS,
} from './constants';
import { mmPerMs } from './scale';

export interface PhaseRange {
  start: number;
  end: number;
}

export type Knot = readonly [from: number, to: number];

export const CYCLE_UNITS = 1000;

export const KNOT_UNITS = {
  jackTouch: 300,
  letOff: 360,
  strike: 400,
  contactEnd: 460,
  checked: 560,
  holdEnd: 860,
  repeatReady: 910,
  damped: 980,
} as const;

export const PHASE_RANGES: Readonly<Record<PhaseId, PhaseRange>> = {
  press: { start: 0, end: KNOT_UNITS.jackTouch },
  escape: { start: KNOT_UNITS.jackTouch, end: KNOT_UNITS.strike },
  strike: { start: KNOT_UNITS.strike, end: KNOT_UNITS.checked },
  check: { start: KNOT_UNITS.checked, end: KNOT_UNITS.holdEnd },
  release: { start: KNOT_UNITS.holdEnd, end: CYCLE_UNITS },
};

export const MOMENTS: Readonly<Record<MomentId, number>> = {
  jackTouch: KNOT_UNITS.jackTouch,
  letOff: KNOT_UNITS.letOff,
  strike: KNOT_UNITS.strike,
  checked: KNOT_UNITS.checked,
  repeatReady: KNOT_UNITS.repeatReady,
  damped: KNOT_UNITS.damped,
};

export const SPEED_RANGE = { min: 0, max: 3, step: 1, default: 2 } as const;
export const FASTEST_LOOP_SECONDS = 4;
export const SLOWEST_SPEED = 0;
export const SLOW_SPEED = 1;
export const DEFAULT_SPEED = 2;
export const REAL_RING_SPEED = 2;

export function loopSeconds(speed: number): number {
  return FASTEST_LOOP_SECONDS * slowMotionFactor(speed, SPEED_RANGE.max);
}

export function rate(speed: number): number {
  return CYCLE_UNITS / loopSeconds(speed);
}

export const DRIVE_MM = BLOW_MM - LET_OFF_MM;
export const KEY_AT_LET_OFF_MM = DRIVE_MM / ACTION_RATIO;
export const KEY_AT_JACK_TOUCH_MM = KEY_AT_LET_OFF_MM - JACK_LEAD_MM;
export const KEY_RELEASE_SPEED = KEY_DIP_MM / RELEASE_MS;

export interface Stroke {
  speed: number;
  strikeMs: number;
  flightMs: number;
  letOffMs: number;
  exponent: number;
  jackTouchMs: number;
  checkMm: number;
  reboundSpeed: number;
  reboundMs: number;
}

function driveTime(riseMm: number, letOffMs: number, exponent: number): number {
  return letOffMs * clamp(riseMm / DRIVE_MM, 0, 1) ** (1 / exponent);
}

function strokeFor(touch: TouchId): Stroke {
  const speed = mmPerMs(HAMMER_SPEED_MS[touch]);
  const strikeMs = STRIKE_MS[touch];
  const flightMs = LET_OFF_MM / speed;
  const letOffMs = strikeMs - flightMs;
  const exponent = (speed * letOffMs) / DRIVE_MM;
  const reboundSpeed = REBOUND_SHARE * speed;
  return {
    speed,
    strikeMs,
    flightMs,
    letOffMs,
    exponent,
    jackTouchMs: driveTime(ACTION_RATIO * KEY_AT_JACK_TOUCH_MM, letOffMs, exponent),
    checkMm: CHECK_MM[touch],
    reboundSpeed,
    reboundMs: CHECK_MM[touch] / reboundSpeed,
  };
}

function byTouch<T>(read: (touch: TouchId) => T): Readonly<Record<TouchId, T>> {
  return Object.fromEntries(TOUCH_IDS.map((touch) => [touch, read(touch)])) as Record<TouchId, T>;
}

export const STROKES: Readonly<Record<TouchId, Stroke>> = byTouch(strokeFor);

export function driveRiseMm(ms: number, stroke: Stroke): number {
  return DRIVE_MM * clamp(ms / stroke.letOffMs, 0, 1) ** stroke.exponent;
}

export function driveSpeed(ms: number, stroke: Stroke): number {
  const share = clamp(ms / stroke.letOffMs, 0, 1);
  return ((stroke.exponent * DRIVE_MM) / stroke.letOffMs) * share ** (stroke.exponent - 1);
}

export function timeAtDriveRise(riseMm: number, stroke: Stroke): number {
  return driveTime(riseMm, stroke.letOffMs, stroke.exponent);
}

export function contactMs(touch: TouchId, register: RegisterId): number {
  return CONTACT_MS[register] * CONTACT_TOUCH_FACTOR[touch];
}

export interface StrokeClock {
  jackTouchMs: number;
  letOffMs: number;
  strikeMs: number;
  contactEndMs: number;
  checkedMs: number;
  holdEndMs: number;
  repeatReadyMs: number;
  dampedMs: number;
  cycleMs: number;
}

function clockFor(touch: TouchId, register: RegisterId): StrokeClock {
  const stroke = STROKES[touch];
  const contactEndMs = stroke.strikeMs + contactMs(touch, register);
  const checkedMs = contactEndMs + stroke.reboundMs;
  const holdEndMs = checkedMs + HOLD_MS;
  return {
    jackTouchMs: stroke.jackTouchMs,
    letOffMs: stroke.letOffMs,
    strikeMs: stroke.strikeMs,
    contactEndMs,
    checkedMs,
    holdEndMs,
    repeatReadyMs: holdEndMs + (REPEAT_RISE_SHARE * KEY_DIP_MM) / KEY_RELEASE_SPEED,
    dampedMs: holdEndMs + (KEY_DIP_MM - DAMPER_LEAVE_KEY_MM) / KEY_RELEASE_SPEED,
    cycleMs: holdEndMs + KEY_DIP_MM / KEY_RELEASE_SPEED,
  };
}

type Clocks = Readonly<Record<TouchId, Readonly<Record<RegisterId, StrokeClock>>>>;

const CLOCKS: Clocks = byTouch((touch) =>
  Object.fromEntries(REGISTER_IDS.map((register) => [register, clockFor(touch, register)])),
) as Clocks;

export function strokeClock(touch: TouchId, register: RegisterId): StrokeClock {
  return CLOCKS[touch][register];
}

function knotsFor(clock: StrokeClock): readonly Knot[] {
  return [
    [0, 0],
    [KNOT_UNITS.jackTouch, clock.jackTouchMs],
    [KNOT_UNITS.letOff, clock.letOffMs],
    [KNOT_UNITS.strike, clock.strikeMs],
    [KNOT_UNITS.contactEnd, clock.contactEndMs],
    [KNOT_UNITS.checked, clock.checkedMs],
    [KNOT_UNITS.holdEnd, clock.holdEndMs],
    [KNOT_UNITS.repeatReady, clock.repeatReadyMs],
    [KNOT_UNITS.damped, clock.dampedMs],
    [CYCLE_UNITS, clock.cycleMs],
  ];
}

export function clockKnots(touch: TouchId, register: RegisterId): readonly Knot[] {
  return knotsFor(strokeClock(touch, register));
}

function piecewise(knots: readonly Knot[], value: number): number {
  const after = knots.findIndex(([at]) => at > value);
  const index = after === -1 ? knots.length - 1 : Math.max(1, after);
  const [fromAt, fromValue] = knots[index - 1];
  const [toAt, toValue] = knots[index];
  const span = toAt - fromAt;
  return span > 0 ? lerp(fromValue, toValue, clamp((value - fromAt) / span, 0, 1)) : toValue;
}

function invert(knots: readonly Knot[]): readonly Knot[] {
  return knots.map(([units, ms]): Knot => [ms, units]);
}

export function wrapUnits(units: number): number {
  return ((units % CYCLE_UNITS) + CYCLE_UNITS) % CYCLE_UNITS;
}

export function realMsAt(units: number, touch: TouchId, register: RegisterId): number {
  return piecewise(clockKnots(touch, register), wrapUnits(units));
}

export function unitsAt(ms: number, touch: TouchId, register: RegisterId): number {
  const clock = strokeClock(touch, register);
  return piecewise(invert(knotsFor(clock)), clamp(ms, 0, clock.cycleMs));
}

export function cycleMs(touch: TouchId, register: RegisterId): number {
  return strokeClock(touch, register).cycleMs;
}

export function phaseAt(units: number): PhaseId {
  const wrapped = wrapUnits(units);
  return PHASE_IDS.find((id) => wrapped < PHASE_RANGES[id].end) ?? 'release';
}

export function inRelease(units: number): boolean {
  return wrapUnits(units) >= KNOT_UNITS.holdEnd;
}
