import type { MachineId } from '../ids';
import { FIELDS_PER_WAFER, SECONDS_PER_HOUR, WAFERS_PER_HOUR } from './constants';
import { opticsOf } from './optics';

export type DropletRateKey = 'exact' | 'orMore';

export function wafersPerHour(machine: MachineId): number {
  return WAFERS_PER_HOUR[machine];
}

export function secondsPerWafer(machine: MachineId): number {
  return SECONDS_PER_HOUR / wafersPerHour(machine);
}

export function scanSeconds(machine: MachineId): number {
  return secondsPerWafer(machine) / FIELDS_PER_WAFER[opticsOf(machine)];
}

export function dropletsPerSecondText(machine: MachineId): DropletRateKey {
  return machine === 'nxe3600d' ? 'exact' : 'orMore';
}
