import { lerp } from '@core/math';
import type { SiteWindId, SpacingD } from '../ids';
import {
  ANNUAL_MWH_PER_TURBINE,
  FARM_RATED_KW,
  HOME_KWH_PER_YEAR,
  HOURS_PER_YEAR,
} from './constants';
import { operatingAt } from './control';
import { CYCLE_MINUTES, MINUTES_PER_HOUR, dayWind, windFromDeg, wrapMinute } from './day';
import { farmPowerKw } from './wakes';

export interface EnergyTable {
  stepMinutes: number;
  farmKw: readonly number[];
  cumulativeMwh: readonly number[];
}

const SAMPLE_STEP_MINUTES = 5;
const SAMPLE_COUNT = CYCLE_MINUTES / SAMPLE_STEP_MINUTES + 1;
const KW_PER_MW = 1000;
const HOURS_PER_DAY = CYCLE_MINUTES / MINUTES_PER_HOUR;
const HOME_AVERAGE_KW = HOME_KWH_PER_YEAR / HOURS_PER_YEAR;

function farmKwAt(minute: number, site: SiteWindId, spacing: SpacingD): number {
  if (!operatingAt(minute, site).producing) return 0;
  return farmPowerKw(dayWind(minute, site), windFromDeg(minute), spacing);
}

function cumulativeMwh(farmKw: readonly number[]): number[] {
  const stepHours = SAMPLE_STEP_MINUTES / MINUTES_PER_HOUR;
  let total = 0;
  return farmKw.map((kw, index) => {
    if (index > 0) total += (((farmKw[index - 1] + kw) / 2) * stepHours) / KW_PER_MW;
    return total;
  });
}

function buildEnergyTable(site: SiteWindId, spacing: SpacingD): EnergyTable {
  const farmKw = Array.from({ length: SAMPLE_COUNT }, (_, index) =>
    farmKwAt(index * SAMPLE_STEP_MINUTES, site, spacing),
  );
  return { stepMinutes: SAMPLE_STEP_MINUTES, farmKw, cumulativeMwh: cumulativeMwh(farmKw) };
}

const energyTables = new Map<string, EnergyTable>();

export function energyTable(site: SiteWindId, spacing: SpacingD): EnergyTable {
  const key = `${site}:${spacing}`;
  const cached = energyTables.get(key);
  if (cached) return cached;
  const table = buildEnergyTable(site, spacing);
  energyTables.set(key, table);
  return table;
}

export function energyTodayMwh(minute: number, site: SiteWindId, spacing: SpacingD): number {
  const { cumulativeMwh: totals } = energyTable(site, spacing);
  const position = wrapMinute(minute) / SAMPLE_STEP_MINUTES;
  const index = Math.floor(position);
  return lerp(totals[index], totals[index + 1], position - index);
}

export function dayEnergyMwh(site: SiteWindId, spacing: SpacingD): number {
  const { cumulativeMwh: totals } = energyTable(site, spacing);
  return totals[totals.length - 1];
}

export function dayCapacityFactor(site: SiteWindId, spacing: SpacingD): number {
  return dayEnergyMwh(site, spacing) / ((FARM_RATED_KW * HOURS_PER_DAY) / KW_PER_MW);
}

export function homesNow(farmKw: number): number {
  return farmKw / HOME_AVERAGE_KW;
}

export function annualHomesPerTurbine(): number {
  return (ANNUAL_MWH_PER_TURBINE * KW_PER_MW) / HOME_KWH_PER_YEAR;
}
