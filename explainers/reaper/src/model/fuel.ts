import { clamp } from '@core/math';
import { PHASE_IDS } from '../ids';
import type { LoadId, PhaseId } from '../ids';
import { MINUTES_PER_HOUR } from './clock';
import { ENDURANCE_H } from './endurance';
import { PHASE_RANGES, minutesAt } from './mission';

export const FUEL_KG = 1814;
export const FULL_POWER_BURN_KG_PER_H = 228;
export const CRUISE_TO_LOITER_BURN = 1.3;

type PowerSetting = 'fullPower' | 'cruise' | 'loiter';

const PHASE_POWER: Readonly<Record<PhaseId, PowerSetting>> = {
  takeoff: 'fullPower',
  climb: 'fullPower',
  handover: 'cruise',
  loiter: 'loiter',
  strike: 'loiter',
  return: 'cruise',
};

interface PhaseMinutes {
  id: PhaseId;
  from: number;
  to: number;
}

const PHASE_MINUTES: readonly PhaseMinutes[] = PHASE_IDS.map((id) => ({
  id,
  from: minutesAt(PHASE_RANGES[id].start),
  to: minutesAt(PHASE_RANGES[id].end),
}));

export interface FuelReading {
  kg: number;
  share: number;
}

export function loiterBurn(load: LoadId): number {
  return FUEL_KG / ENDURANCE_H[load];
}

export function burnRate(setting: PowerSetting, load: LoadId): number {
  if (setting === 'fullPower') return FULL_POWER_BURN_KG_PER_H;
  if (setting === 'cruise') return CRUISE_TO_LOITER_BURN * loiterBurn(load);
  return loiterBurn(load);
}

export function fuelUsedKg(minutes: number, load: LoadId): number {
  return PHASE_MINUTES.reduce((used, phase) => {
    const flown = clamp(minutes, phase.from, phase.to) - phase.from;
    return used + (burnRate(PHASE_POWER[phase.id], load) * flown) / MINUTES_PER_HOUR;
  }, 0);
}

export function fuelAt(units: number, load: LoadId): FuelReading {
  const kg = Math.max(0, FUEL_KG - fuelUsedKg(minutesAt(units), load));
  return { kg, share: kg / FUEL_KG };
}
