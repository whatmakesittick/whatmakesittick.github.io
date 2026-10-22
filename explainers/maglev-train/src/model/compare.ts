import type { CompareId, TopSpeedId } from '../ids';
import { GAP_MM, RECORD_KMH } from './constants';

export interface CompareEntry {
  gapMm: number | null;
  recordKmh: number;
  recordYear: number;
  lift: CompareId;
}

type EnergyKmh = 200 | 300 | 400;

export interface EnergyRow {
  maglev: number;
  wheel: number | null;
}

export interface EnergyReading extends EnergyRow {
  atKmh: number;
}

export const COMPARE: Readonly<Record<CompareId, CompareEntry>> = {
  transrapid: { gapMm: GAP_MM, recordKmh: RECORD_KMH, recordYear: 2003, lift: 'transrapid' },
  scmaglev: { gapMm: 100, recordKmh: 603, recordYear: 2015, lift: 'scmaglev' },
  wheelRail: { gapMm: null, recordKmh: 574.8, recordYear: 2007, lift: 'wheelRail' },
};

export const ENERGY_WH_PER_SEAT_KM: Readonly<Record<EnergyKmh, EnergyRow>> = {
  200: { maglev: 22, wheel: 29 },
  300: { maglev: 34, wheel: 51 },
  400: { maglev: 52, wheel: null },
};

const ENERGY_ROW_FOR: Readonly<Record<TopSpeedId, EnergyKmh>> = {
  kmh430: 400,
  kmh300: 300,
};

export function energyFor(topSpeed: TopSpeedId): EnergyReading {
  const atKmh = ENERGY_ROW_FOR[topSpeed];
  return { ...ENERGY_WH_PER_SEAT_KM[atKmh], atKmh };
}
