import { clamp } from '@core/math';
import type { GasId, TankReading } from '../ids';
import { EMPTY_BELOW_BAR, G, TOUCHDOWN_SPEED_MS } from './constants';
import { exhaustSpeed, pressureAt, shareAtPressure, storedMass } from './gas';
import { NEWTONS_PER_KILONEWTON } from './units';
import { BURNS, PHASE_RANGES, burnThrust, catchFallAt, landingFallAt } from './run';
import type { FallState, PhaseRange } from './run';

export function impulseUsedKns(seconds: number): number {
  const newtonSeconds = BURNS.reduce(
    (sum, burn) => sum + burnThrust(burn) * clamp(seconds - burn.start, 0, burn.end - burn.start),
    0,
  );
  return newtonSeconds / NEWTONS_PER_KILONEWTON;
}

function secondsAtImpulse(kns: number): number | null {
  let spent = 0;
  for (const burn of BURNS) {
    const burnKns = (burnThrust(burn) * (burn.end - burn.start)) / NEWTONS_PER_KILONEWTON;
    if (spent + burnKns >= kns) {
      return burn.start + ((kns - spent) * NEWTONS_PER_KILONEWTON) / burnThrust(burn);
    }
    spent += burnKns;
  }
  return null;
}

export function emptyShare(): number {
  return shareAtPressure(EMPTY_BELOW_BAR);
}

export function usableMassKg(gas: GasId, litres: number): number {
  return storedMass(gas, litres) * (1 - emptyShare());
}

export function emptyAtSeconds(gas: GasId, litres: number): number | null {
  const usableKns = (usableMassKg(gas, litres) * exhaustSpeed(gas)) / NEWTONS_PER_KILONEWTON;
  return secondsAtImpulse(usableKns);
}

interface CushionedFall {
  range: PhaseRange;
  fallAt(elapsed: number): FallState;
}

const CUSHIONS: readonly CushionedFall[] = [
  { range: PHASE_RANGES.catch, fallAt: catchFallAt },
  { range: PHASE_RANGES.landing, fallAt: landingFallAt },
];

export function shortfallMs(gas: GasId, litres: number): number {
  const emptyAt = emptyAtSeconds(gas, litres);
  if (emptyAt === null) return 0;
  const lost = CUSHIONS.find(({ range }) => emptyAt < range.end);
  if (!lost) return 0;
  const cut = Math.max(emptyAt, lost.range.start);
  const fall = lost.fallAt(cut - lost.range.start);
  return Math.sqrt(fall.verticalSpeed ** 2 + 2 * G * fall.height) - TOUCHDOWN_SPEED_MS;
}

export function tankAt(seconds: number, gas: GasId, litres: number): TankReading {
  const stored = storedMass(gas, litres);
  const usedKg = (impulseUsedKns(seconds) * NEWTONS_PER_KILONEWTON) / exhaustSpeed(gas);
  const massShare = Math.max(emptyShare(), 1 - usedKg / stored);
  const emptyAt = emptyAtSeconds(gas, litres);
  return {
    pressureBar: pressureAt(massShare),
    massKg: stored * massShare,
    massShare,
    empty: emptyAt !== null && seconds >= emptyAt,
    emptyAtSeconds: emptyAt,
    shortfallMs: shortfallMs(gas, litres),
  };
}
