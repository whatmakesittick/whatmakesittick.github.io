import type { PedalId, RegisterId, StrokeReading, TouchId } from '../ids';
import { SYMPATHY_SHARE } from './constants';
import { damperAt } from './action';
import { toSeconds } from './scale';
import { NOTES, dbToGain, levelDbAfter, noteDamped, stringsStruck } from './tone';
import { KNOT_UNITS, phaseAt, realMsAt, strokeClock, wrapUnits } from './timing';

function secondsSinceStrike(units: number, touch: TouchId, register: RegisterId): number {
  const clock = strokeClock(touch, register);
  const ms = realMsAt(units, touch, register);
  const sinceMs = ms >= clock.strikeMs ? ms - clock.strikeMs : ms + clock.cycleMs - clock.strikeMs;
  return toSeconds(sinceMs);
}

function silent(units: number, pedal: PedalId, register: RegisterId): boolean {
  if (!noteDamped(pedal, register)) return false;
  const at = wrapUnits(units);
  return at < KNOT_UNITS.strike || at >= KNOT_UNITS.damped;
}

export function levelDbAt(
  units: number,
  touch: TouchId,
  pedal: PedalId,
  register: RegisterId,
): number | null {
  if (silent(units, pedal, register)) return null;
  return levelDbAfter(secondsSinceStrike(units, touch, register), touch, pedal, register);
}

export function strokeReadingAt(
  units: number,
  touch: TouchId,
  pedal: PedalId,
  register: RegisterId,
): StrokeReading {
  const levelDb = levelDbAt(units, touch, pedal, register);
  const stringShare = levelDb === null ? 0 : dbToGain(levelDb);
  return {
    phase: phaseAt(units),
    realMs: realMsAt(units, touch, register),
    levelDb,
    stringShare,
    sympathyShare: pedal === 'sustain' ? SYMPATHY_SHARE * stringShare : 0,
    stringsStruck: stringsStruck(register, pedal),
    strings: NOTES[register].strings,
    damperState: damperAt(units, touch, pedal, register).state,
  };
}
