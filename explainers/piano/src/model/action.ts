import { clamp, lerp, smoothstep } from '@core/math';
import type { ActionPose, DamperStateId, PedalId, RegisterId, TouchId } from '../ids';
import {
  ACTION_RATIO,
  BLOW_MM,
  DAMPER_LEAVE_KEY_MM,
  DAMPER_LIFT_MAX_MM,
  DAMPER_RATIO,
  ESCAPE_AT_LET_OFF,
  FELT_SQUASH_MM,
  JACK_LEAD_MM,
  KEY_DIP_MM,
  PLAYED_KEY,
  REP_LIFT_MM,
} from './constants';
import { SHIFT_MM, hasDamper } from './layout';
import { metresPerSecond } from './scale';
import {
  DRIVE_MM,
  KEY_AT_JACK_TOUCH_MM,
  KEY_AT_LET_OFF_MM,
  KEY_RELEASE_SPEED,
  KNOT_UNITS,
  STROKES,
  driveRiseMm,
  driveSpeed,
  inRelease,
  realMsAt,
  strokeClock,
  wrapUnits,
} from './timing';
import type { Stroke, StrokeClock } from './timing';

export interface HammerReading {
  riseMm: number;
  speedMs: number;
  contact: boolean;
  checked: boolean;
  feltSquashMm: number;
}

export interface DamperReading {
  liftMm: number;
  state: DamperStateId;
}

const REP_HELD_SHARE = 0.4;
const LIFT_TOLERANCE_MM = 1e-9;
const HARD_SPEED = STROKES.hard.speed;

interface Moment {
  ms: number;
  stroke: Stroke;
  clock: StrokeClock;
}

function momentAt(units: number, touch: TouchId, register: RegisterId): Moment {
  return {
    ms: realMsAt(units, touch, register),
    stroke: STROKES[touch],
    clock: strokeClock(touch, register),
  };
}

function keyAtMs({ ms, stroke, clock }: Moment): number {
  if (ms >= clock.holdEndMs) {
    return Math.max(0, KEY_DIP_MM - KEY_RELEASE_SPEED * (ms - clock.holdEndMs));
  }
  if (ms <= stroke.letOffMs) return driveRiseMm(ms, stroke) / ACTION_RATIO;
  const keySpeed = stroke.speed / ACTION_RATIO;
  return Math.min(KEY_DIP_MM, KEY_AT_LET_OFF_MM + keySpeed * (ms - stroke.letOffMs));
}

export function keyMmAt(units: number, touch: TouchId, register: RegisterId): number {
  return keyAtMs(momentAt(units, touch, register));
}

function moving(riseMm: number, speed: number): HammerReading {
  return {
    riseMm,
    speedMs: metresPerSecond(speed),
    contact: false,
    checked: false,
    feltSquashMm: 0,
  };
}

function onString({ ms, stroke, clock }: Moment): HammerReading {
  const share = clamp((ms - clock.strikeMs) / (clock.contactEndMs - clock.strikeMs), 0, 1);
  return {
    riseMm: BLOW_MM,
    speedMs: metresPerSecond(lerp(stroke.speed, -stroke.reboundSpeed, share)),
    contact: true,
    checked: false,
    feltSquashMm: FELT_SQUASH_MM * (stroke.speed / HARD_SPEED) * Math.sin(Math.PI * share),
  };
}

function releasing(moment: Moment): HammerReading {
  const { ms, stroke, clock } = moment;
  const checkedRise = BLOW_MM - stroke.checkMm;
  const lifted = checkedRise + REP_LIFT_MM * smoothstep(ms, clock.holdEndMs, clock.repeatReadyMs);
  if (ms < clock.repeatReadyMs) return moving(lifted, 0);
  const following = ACTION_RATIO * keyAtMs(moment);
  if (following >= lifted) return moving(lifted, 0);
  return moving(following, -ACTION_RATIO * KEY_RELEASE_SPEED);
}

function hammerAtMs(moment: Moment): HammerReading {
  const { ms, stroke, clock } = moment;
  if (ms <= stroke.letOffMs) return moving(driveRiseMm(ms, stroke), driveSpeed(ms, stroke));
  if (ms < clock.strikeMs)
    return moving(DRIVE_MM + stroke.speed * (ms - stroke.letOffMs), stroke.speed);
  if (ms < clock.contactEndMs) return onString(moment);
  if (ms < clock.checkedMs) {
    return moving(BLOW_MM - stroke.reboundSpeed * (ms - clock.contactEndMs), -stroke.reboundSpeed);
  }
  if (ms < clock.holdEndMs) return { ...moving(BLOW_MM - stroke.checkMm, 0), checked: true };
  return releasing(moment);
}

export function hammerAt(units: number, touch: TouchId, register: RegisterId): HammerReading {
  return hammerAtMs(momentAt(units, touch, register));
}

export function pressEscape(keyMm: number): number {
  if (keyMm <= KEY_AT_JACK_TOUCH_MM) return 0;
  if (keyMm <= KEY_AT_LET_OFF_MM) {
    return (ESCAPE_AT_LET_OFF * (keyMm - KEY_AT_JACK_TOUCH_MM)) / JACK_LEAD_MM;
  }
  const aftertouch = clamp((keyMm - KEY_AT_LET_OFF_MM) / (KEY_DIP_MM - KEY_AT_LET_OFF_MM), 0, 1);
  return ESCAPE_AT_LET_OFF + (1 - ESCAPE_AT_LET_OFF) * aftertouch;
}

export function jackEscapeAt(units: number, touch: TouchId, register: RegisterId): number {
  if (!inRelease(units)) return pressEscape(keyMmAt(units, touch, register));
  return 1 - smoothstep(wrapUnits(units), KNOT_UNITS.holdEnd, KNOT_UNITS.repeatReady);
}

export function repetitionLiftAt(units: number): number {
  const at = wrapUnits(units);
  if (at < KNOT_UNITS.contactEnd) {
    return 1 - smoothstep(at, KNOT_UNITS.jackTouch, KNOT_UNITS.letOff);
  }
  if (at < KNOT_UNITS.holdEnd) {
    return REP_HELD_SHARE * smoothstep(at, KNOT_UNITS.contactEnd, KNOT_UNITS.checked);
  }
  return lerp(REP_HELD_SHARE, 1, smoothstep(at, KNOT_UNITS.holdEnd, KNOT_UNITS.repeatReady));
}

function damperState(liftMm: number, units: number): DamperStateId {
  if (liftMm <= 0) return 'down';
  if (liftMm >= DAMPER_LIFT_MAX_MM - LIFT_TOLERANCE_MM) return 'up';
  return inRelease(units) ? 'falling' : 'rising';
}

export function damperAt(
  units: number,
  touch: TouchId,
  pedal: PedalId,
  register: RegisterId,
): DamperReading {
  if (!hasDamper(PLAYED_KEY[register])) return { liftMm: 0, state: 'none' };
  if (pedal === 'sustain') return { liftMm: DAMPER_LIFT_MAX_MM, state: 'pedal' };
  const keyMm = keyMmAt(units, touch, register);
  const liftMm = DAMPER_RATIO * Math.max(0, keyMm - DAMPER_LEAVE_KEY_MM);
  return { liftMm, state: damperState(liftMm, units) };
}

export function shiftMmFor(pedal: PedalId): number {
  return pedal === 'unaCorda' ? SHIFT_MM : 0;
}

export function actionPoseAt(
  units: number,
  touch: TouchId,
  pedal: PedalId,
  register: RegisterId,
): ActionPose {
  const moment = momentAt(units, touch, register);
  const hammer = hammerAtMs(moment);
  const damper = damperAt(units, touch, pedal, register);
  return {
    keyMm: keyAtMs(moment),
    hammerRiseMm: hammer.riseMm,
    hammerToStringMm: Math.max(0, BLOW_MM - hammer.riseMm),
    hammerSpeedMs: hammer.speedMs,
    contact: hammer.contact,
    feltSquashMm: hammer.feltSquashMm,
    jackEscape: jackEscapeAt(units, touch, register),
    repetitionLift: repetitionLiftAt(units),
    checked: hammer.checked,
    damperLiftMm: damper.liftMm,
    damperState: damper.state,
    shiftMm: shiftMmFor(pedal),
  };
}
