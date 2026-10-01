import { clamp } from '@core/math';
import type { GasPortId, ShotReading } from '../ids';
import {
  BARREL_TIME_MS,
  pressureAtTravel,
  speedAtTravel,
  travelAtTime,
  travelTimeMs,
} from './bore';
import {
  MM_PER_METRE,
  MUZZLE_PRESSURE_MPA,
  MUZZLE_SPEED,
  START_PRESSURE_MPA,
  TWIST_MM,
} from './constants';
import { keyframes } from './keyframes';
import { BULLET_SEAT_X, BULLET_TRAVEL, CARTRIDGE, RIFLING } from './layout';
import { VENTS_CLEAR_MS } from './motion';
import { EXIT_MS, PORT_MS, START_MS, STRIKE_MS } from './timing';

export { BARREL_TIME_MS, travelTimeMs };

const PRESSURE_DECAY_MS = 0.5;
const FLASH_MS = 1;
const GAS_VENT_MS = 2;
const ENGRAVING_LENGTH = CARTRIDGE.bulletLength;
const BASE_AT_RIFLING = RIFLING.x[0] - BULLET_SEAT_X;
const ENGRAVING_START = BASE_AT_RIFLING - ENGRAVING_LENGTH / 2;

function engravedShare(travel: number): number {
  return clamp((travel - ENGRAVING_START) / ENGRAVING_LENGTH, 0, 1);
}

function spinningLength(travel: number): number {
  const depth = travel - ENGRAVING_START;
  if (depth <= 0) return 0;
  if (depth < ENGRAVING_LENGTH) return depth ** 2 / (2 * ENGRAVING_LENGTH);
  return depth - ENGRAVING_LENGTH / 2;
}

export function turnsAt(travel: number): number {
  return (spinningLength(travel) - spinningLength(0)) / TWIST_MM;
}

export function spinAt(travel: number, speed: number): number {
  return (engravedShare(travel) * speed * MM_PER_METRE) / TWIST_MM;
}

export const EXIT_SPIN = spinAt(BULLET_TRAVEL, MUZZLE_SPEED);
export const EXIT_TURNS = turnsAt(BULLET_TRAVEL);

const ignitionTrack = keyframes([
  { at: STRIKE_MS, value: 0 },
  { at: START_MS, value: START_PRESSURE_MPA },
]);

const ventingTrack = keyframes([
  { at: EXIT_MS, value: MUZZLE_PRESSURE_MPA },
  { at: EXIT_MS + PRESSURE_DECAY_MS, value: 0 },
]);

const flashTrack = keyframes([
  { at: EXIT_MS, value: 1 },
  { at: EXIT_MS + FLASH_MS, value: 0 },
]);

const gasTrack = keyframes([
  { at: PORT_MS, value: 0 },
  { at: EXIT_MS, value: 1 },
  { at: VENTS_CLEAR_MS, value: 1 },
  { at: VENTS_CLEAR_MS + GAS_VENT_MS, value: 0 },
]);

function seatedAt(ms: number, gas: number): ShotReading {
  return {
    pressure: ignitionTrack(ms),
    travel: 0,
    speed: 0,
    spin: 0,
    turns: 0,
    stage: 'seated',
    muzzleFlash: 0,
    gas,
  };
}

function movingAt(ms: number, gas: number): ShotReading {
  const travel = travelAtTime(ms - START_MS);
  const speed = speedAtTravel(travel);
  return {
    pressure: pressureAtTravel(travel),
    travel,
    speed,
    spin: spinAt(travel, speed),
    turns: turnsAt(travel),
    stage: 'moving',
    muzzleFlash: 0,
    gas,
  };
}

function goneAt(ms: number, gas: number): ShotReading {
  return {
    pressure: ventingTrack(ms),
    travel: BULLET_TRAVEL,
    speed: MUZZLE_SPEED,
    spin: EXIT_SPIN,
    turns: EXIT_TURNS,
    stage: 'gone',
    muzzleFlash: flashTrack(ms),
    gas,
  };
}

export function shotTimeAt(travel: number): number {
  return START_MS + travelTimeMs(clamp(travel, 0, BULLET_TRAVEL));
}

export function shotAt(ms: number, gasPort: GasPortId = 'open'): ShotReading {
  const gas = gasPort === 'open' ? gasTrack(ms) : 0;
  if (ms < START_MS) return seatedAt(ms, gas);
  if (ms < EXIT_MS) return movingAt(ms, gas);
  return goneAt(ms, gas);
}
