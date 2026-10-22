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

const TRANSRAPID_RECORD_YEAR = 2003;
const SCMAGLEV_GAP_MM = 100;
const SCMAGLEV_RECORD_KMH = 603;
const SCMAGLEV_RECORD_YEAR = 2015;
const WHEEL_RAIL_RECORD_KMH = 574.8;
const WHEEL_RAIL_RECORD_YEAR = 2007;

export const COMPARE: Readonly<Record<CompareId, CompareEntry>> = {
  transrapid: {
    gapMm: GAP_MM,
    recordKmh: RECORD_KMH,
    recordYear: TRANSRAPID_RECORD_YEAR,
    lift: 'transrapid',
  },
  scmaglev: {
    gapMm: SCMAGLEV_GAP_MM,
    recordKmh: SCMAGLEV_RECORD_KMH,
    recordYear: SCMAGLEV_RECORD_YEAR,
    lift: 'scmaglev',
  },
  wheelRail: {
    gapMm: null,
    recordKmh: WHEEL_RAIL_RECORD_KMH,
    recordYear: WHEEL_RAIL_RECORD_YEAR,
    lift: 'wheelRail',
  },
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
