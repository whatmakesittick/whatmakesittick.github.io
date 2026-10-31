import type { BenchmarkId, CoolingId, LoadId, RackReading } from '../ids';
import {
  CHARGER_W,
  EU_HOME_KWH,
  HOURS_PER_YEAR,
  IDLE_SHARE,
  PUE,
  RACK_COUNT,
  RACK_KW,
  US_HOME_KWH,
} from './constants';
import { fanShareAt } from './fans';
import { kwToMw } from './scale';

export interface HomesReading {
  us: number;
  eu: number;
}

const W_PER_KW = 1000;

const LOAD_SHARE: Readonly<Record<LoadId, number>> = { full: 1, idle: IDLE_SHARE };

export function rackPowerKw(cooling: CoolingId, load: LoadId): number {
  return RACK_KW[cooling] * LOAD_SHARE[load];
}

export function hallPowerMw(cooling: CoolingId, load: LoadId): number {
  return kwToMw(RACK_COUNT * rackPowerKw(cooling, load));
}

export function facilityPowerMw(itMw: number, benchmark: BenchmarkId): number {
  return itMw * PUE[benchmark];
}

export function overheadShare(benchmark: BenchmarkId): number {
  const pue = PUE[benchmark];
  return (pue - 1) / pue;
}

export function homesFor(rackKw: number): HomesReading {
  const yearKwh = rackKw * HOURS_PER_YEAR;
  return { us: yearKwh / US_HOME_KWH, eu: yearKwh / EU_HOME_KWH };
}

export function chargersFor(rackKw: number): number {
  return (rackKw * W_PER_KW) / CHARGER_W;
}

export function rackReading(cooling: CoolingId, load: LoadId): RackReading {
  return {
    rackKw: rackPowerKw(cooling, load),
    hallMw: hallPowerMw(cooling, load),
    fanShare: fanShareAt(cooling, load),
  };
}
