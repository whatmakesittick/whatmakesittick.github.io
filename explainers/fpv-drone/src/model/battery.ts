import { clamp, lerp } from '@core/math';
import type { BatteryReading } from '../ids';
import { PACK } from './figures';
import { flightAt } from './flight';
import type { FlightMotion } from './flight';
import { totalThrustG } from './motors';
import { allUpG } from './payload';
import { powerAt } from './power';
import { SECONDS_PER_MINUTE, SORTIE_SECONDS, clampSeconds } from './sortie';

export const BATTERY = {
  cells: PACK.cells,
  nominalVolts: PACK.cells * PACK.cellNominalV,
  fullVolts: PACK.cells * PACK.cellFullV,
  emptyVolts: PACK.cells * PACK.cellEmptyV,
  capacityMah: PACK.capacityMah,
  massG: PACK.massG,
  resistanceOhm: PACK.resistanceOhm,
} as const;

export const BATTERY_GRID_S = 0.5;

const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * SECONDS_PER_MINUTE;
const MILLI = 1000;
const GRID_STEPS = Math.ceil(SORTIE_SECONDS / BATTERY_GRID_S);
const HALF = 0.5;

const usedMahGrids = new Map<number, Float64Array>();

export function openCircuitVolts(share: number): number {
  return lerp(BATTERY.emptyVolts, BATTERY.fullVolts, clamp(share, 0, 1));
}

export function loadedVolts(openVolts: number, watts: number): number {
  const discriminant = openVolts * openVolts - 4 * watts * BATTERY.resistanceOhm;
  if (discriminant <= 0) return openVolts * HALF;
  return (openVolts + Math.sqrt(discriminant)) * HALF;
}

export function wattsAt(flight: FlightMotion, payloadG: number): number {
  return powerAt(totalThrustG(flight, allUpG(payloadG)), flight.speedKmh);
}

function shareLeft(usedMah: number): number {
  return clamp(1 - usedMah / BATTERY.capacityMah, 0, 1);
}

function integrate(payloadG: number): Float64Array {
  const grid = new Float64Array(GRID_STEPS + 1);
  let used = 0;
  for (let step = 0; step < GRID_STEPS; step += 1) {
    const watts = wattsAt(flightAt(step * BATTERY_GRID_S), payloadG);
    const volts = loadedVolts(openCircuitVolts(shareLeft(used)), watts);
    used += ((watts / volts) * BATTERY_GRID_S * MILLI) / SECONDS_PER_HOUR;
    grid[step + 1] = used;
  }
  return grid;
}

function usedMahGrid(payloadG: number): Float64Array {
  const remembered = usedMahGrids.get(payloadG);
  if (remembered) return remembered;
  const grid = integrate(payloadG);
  usedMahGrids.set(payloadG, grid);
  return grid;
}

export function usedMahAt(seconds: number, payloadG: number): number {
  const grid = usedMahGrid(payloadG);
  const position = clampSeconds(seconds) / BATTERY_GRID_S;
  const index = Math.min(Math.floor(position), GRID_STEPS - 1);
  return lerp(grid[index], grid[index + 1], position - index);
}

export function batteryAt(seconds: number, payloadG: number): BatteryReading {
  const usedMah = usedMahAt(seconds, payloadG);
  const share = shareLeft(usedMah);
  const watts = wattsAt(flightAt(seconds), payloadG);
  const volts = loadedVolts(openCircuitVolts(share), watts);
  return { share, volts, amps: watts / volts, usedMah };
}
