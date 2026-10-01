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
import { BULLET_SEAT_X, BULLET_TRAVEL, RIFLED_LENGTH, RIFLING } from './layout';
import { VENTS_CLEAR_MS } from './motion';
import { EXIT_MS, PORT_MS, START_MS, STRIKE_MS } from './timing';

export { BARREL_TIME_MS, travelTimeMs };

const PRESSURE_DECAY_MS = 0.5;
const FLASH_MS = 1;
const GAS_VENT_MS = 2;

function rifledTravel(travel: number): number {
  return clamp(BULLET_SEAT_X + travel - RIFLING.x[0], 0, RIFLED_LENGTH);
}

export function turnsAt(travel: number): number {
  return rifledTravel(travel) / TWIST_MM;
}

export function spinAt(travel: number, speed: number): number {
  return rifledTravel(travel) > 0 ? (speed * MM_PER_METRE) / TWIST_MM : 0;
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

export function shotAt(ms: number, gasPort: GasPortId = 'open'): ShotReading {
  const gas = gasPort === 'open' ? gasTrack(ms) : 0;
  if (ms < START_MS) return seatedAt(ms, gas);
  if (ms < EXIT_MS) return movingAt(ms, gas);
  return goneAt(ms, gas);
}
