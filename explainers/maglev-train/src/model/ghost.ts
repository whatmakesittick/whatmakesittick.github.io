import type { GhostReading } from '../ids';
import { GHOST_ACCEL, GHOST_TOP_KMH, LIFT_SECONDS } from './constants';
import { toKmh, toMs } from './scale';

interface GhostTravel {
  speedMs: number;
  metres: number;
}

const TOP_MS = toMs(GHOST_TOP_KMH);
const RAMP_SECONDS = TOP_MS / GHOST_ACCEL;
const RAMP_METRES = TOP_MS ** 2 / (2 * GHOST_ACCEL);

function rampTravel(elapsed: number): GhostTravel {
  return { speedMs: GHOST_ACCEL * elapsed, metres: 0.5 * GHOST_ACCEL * elapsed ** 2 };
}

function cruiseTravel(elapsed: number): GhostTravel {
  return { speedMs: TOP_MS, metres: RAMP_METRES + TOP_MS * (elapsed - RAMP_SECONDS) };
}

function travelAfter(elapsed: number): GhostTravel {
  return elapsed < RAMP_SECONDS ? rampTravel(elapsed) : cruiseTravel(elapsed);
}

export function ghostAt(realSeconds: number, distance: number): GhostReading {
  const { speedMs, metres } = travelAfter(Math.max(0, realSeconds - LIFT_SECONDS));
  return { distance: metres, speedKmh: toKmh(speedMs), behind: distance - metres };
}
