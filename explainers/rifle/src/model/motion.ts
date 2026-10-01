import type { GasPortId, MotionReading } from '../ids';
import { accelerate, decelerate, easeInOut, keyframes, timeWhen } from './keyframes';
import {
  CARRIER_STROKE,
  EJECTOR_X,
  FREE_TRAVEL,
  HAMMER,
  RETARDER_ANGLE,
  UNLOCK_ANGLE,
} from './layout';
import { EXIT_MS, LOCKED_MS, REAR_MS, STRIKE_MS, UNLOCKED_MS } from './timing';

const FREE_TRAVEL_END_MS = 7;
const UNLOCKED_CARRIER_MM = 20;
const LOCK_TURN_START_MS = 85;
const CASE_FLIGHT_MS = 11;
const FEED_START_MS = 48;
const FEED_END_MS = 86;
const VENT_CLEAR_TRAVEL_MM = 25;
const TRIGGER_HELD = 1;

export const HAMMER_TIMES = {
  struck: STRIKE_MS,
  cockStart: 12,
  cocked: 22,
  released: LOCKED_MS,
  caught: 93,
} as const;

const carrierTrack = keyframes([
  { at: EXIT_MS, value: 0 },
  { at: FREE_TRAVEL_END_MS, value: FREE_TRAVEL },
  { at: UNLOCKED_MS, value: UNLOCKED_CARRIER_MM },
  { at: REAR_MS, value: CARRIER_STROKE, ease: decelerate },
  { at: LOCKED_MS, value: 0, ease: easeInOut },
]);

const boltTrack = keyframes([
  { at: FREE_TRAVEL_END_MS, value: 0 },
  { at: UNLOCKED_MS, value: -UNLOCK_ANGLE },
  { at: LOCK_TURN_START_MS, value: -UNLOCK_ANGLE },
  { at: LOCKED_MS, value: 0 },
]);

const hammerFall = [
  { at: 0, value: RETARDER_ANGLE },
  { at: HAMMER_TIMES.struck, value: 0, ease: accelerate },
] as const;

const hammerTrack = keyframes([
  ...hammerFall,
  { at: HAMMER_TIMES.cockStart, value: 0 },
  { at: HAMMER_TIMES.cocked, value: HAMMER.swing },
  { at: HAMMER_TIMES.released, value: HAMMER.swing },
  { at: HAMMER_TIMES.caught, value: RETARDER_ANGLE, ease: accelerate },
]);

const blockedHammerTrack = keyframes(hammerFall);

export function boltTravel(carrier: number): number {
  return Math.max(0, carrier - FREE_TRAVEL);
}

export function boltFaceX(carrier: number): number {
  return -boltTravel(carrier);
}

export const EJECT_MS = timeWhen(carrierTrack, FREE_TRAVEL - EJECTOR_X, UNLOCKED_MS, REAR_MS);

export const VENTS_CLEAR_MS = timeWhen(carrierTrack, VENT_CLEAR_TRAVEL_MM, UNLOCKED_MS, REAR_MS);

export const CASE_GONE_MS = EJECT_MS + CASE_FLIGHT_MS;

const caseFlightTrack = keyframes([
  { at: EJECT_MS, value: 0 },
  { at: CASE_GONE_MS, value: 1 },
]);

const feedTrack = keyframes([
  { at: FEED_START_MS, value: 0 },
  { at: FEED_END_MS, value: 1 },
]);

function blockedMotionAt(ms: number): MotionReading {
  return {
    carrier: 0,
    bolt: 0,
    hammer: blockedHammerTrack(ms),
    spring: 0,
    caseFlight: 0,
    feed: 0,
    trigger: TRIGGER_HELD,
  };
}

export function motionAt(ms: number, gasPort: GasPortId): MotionReading {
  if (gasPort === 'blocked') return blockedMotionAt(ms);
  const carrier = carrierTrack(ms);
  return {
    carrier,
    bolt: boltTrack(ms),
    hammer: hammerTrack(ms),
    spring: carrier / CARRIER_STROKE,
    caseFlight: caseFlightTrack(ms),
    feed: feedTrack(ms),
    trigger: TRIGGER_HELD,
  };
}
