import { CYCLE_MS } from './constants';
import { keyframes } from './keyframes';
import { EXIT_MS, LOCKED_MS, REAR_MS, START_MS, STRIKE_MS, UNLOCKED_MS } from './timing';

export const CYCLE_UNITS = 100;

export const CLOCK_UNITS = {
  strike: 10,
  start: 14,
  exit: 40,
  unlocked: 55,
  rear: 75,
  locked: 95,
} as const;

export interface ClockKnot {
  units: number;
  ms: number;
}

export const CLOCK_KNOTS: readonly ClockKnot[] = [
  { units: 0, ms: 0 },
  { units: CLOCK_UNITS.strike, ms: STRIKE_MS },
  { units: CLOCK_UNITS.start, ms: START_MS },
  { units: CLOCK_UNITS.exit, ms: EXIT_MS },
  { units: CLOCK_UNITS.unlocked, ms: UNLOCKED_MS },
  { units: CLOCK_UNITS.rear, ms: REAR_MS },
  { units: CLOCK_UNITS.locked, ms: LOCKED_MS },
  { units: CYCLE_UNITS, ms: CYCLE_MS },
];

export const msAt = keyframes(CLOCK_KNOTS.map((knot) => ({ at: knot.units, value: knot.ms })));

export const unitsAt = keyframes(CLOCK_KNOTS.map((knot) => ({ at: knot.ms, value: knot.units })));
