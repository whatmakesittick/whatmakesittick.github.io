import { formatFixed, formatNumber } from '@core/format';
import { t } from '@core/i18n';
import type { OperatingStateId } from '../ids';
import {
  COLLECTOR_KV,
  GENERATOR_VOLTS,
  GRID_KV,
  ROTOR_DIAMETER_M,
  SWEPT_AREA_M2,
  sweptPitches,
  tipSpeed,
  turnSeconds,
} from '../model';

const WHOLE = 0;
const TENTHS = 1;
const HUNDREDTHS = 2;
const PERCENT = 100;
const KW_PER_MW = 1000;
const KMH_PER_MS = 3.6;
const KMH_STEP = 10;
const GENERATOR_RPM_STEP = 5;
const GEAR_RATIO_STEP = 10;
const HOMES_STEP = 100;

function unit(key: string, value: string): string {
  return t(`units.${key}`, { value });
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function whole(value: number): string {
  return formatNumber(Math.round(value));
}

export function formatWind(metresPerSecond: number): string {
  return unit('metresPerSecond', formatFixed(metresPerSecond, TENTHS));
}

export function formatRpm(rpm: number): string {
  return unit('rpm', formatFixed(rpm, TENTHS));
}

export function formatGeneratorRpm(rpm: number): string {
  return unit('rpm', formatNumber(roundTo(rpm, GENERATOR_RPM_STEP)));
}

export function formatTurnTime(rpm: number): string {
  if (rpm <= 0) return t('chapters.tower.stopped');
  return unit('seconds', formatFixed(turnSeconds(rpm), TENTHS));
}

export function formatTipSpeed(rpm: number): string {
  const metresPerSecond = tipSpeed(rpm);
  return t('units.speedPair', {
    ms: whole(metresPerSecond),
    kmh: formatNumber(roundTo(metresPerSecond * KMH_PER_MS, KMH_STEP)),
  });
}

export function formatTurbineMw(kw: number): string {
  return unit('mw', formatFixed(kw / KW_PER_MW, HUNDREDTHS));
}

export function formatFarmMw(kw: number): string {
  return unit('mw', formatFixed(kw / KW_PER_MW, TENTHS));
}

export function formatRatedMw(mw: number): string {
  return unit('mw', formatFixed(mw, TENTHS));
}

export function formatMwh(mwh: number): string {
  return unit('mwh', whole(mwh));
}

export function formatPercent(fraction: number): string {
  return unit('percent', whole(fraction * PERCENT));
}

export function formatLossPercent(fraction: number): string {
  return unit('percent', formatFixed(fraction * PERCENT, TENTHS));
}

export function formatDegrees(degrees: number): string {
  return unit('degrees', whole(degrees));
}

export function formatMetres(metres: number, fractionDigits = WHOLE): string {
  return unit('metres', formatFixed(metres, fractionDigits));
}

export function formatCount(count: number): string {
  return unit('count', whole(count));
}

export function formatHomes(homes: number): string {
  return unit('count', formatNumber(roundTo(homes, HOMES_STEP)));
}

export function formatHectares(hectares: number): string {
  return unit('hectares', whole(hectares));
}

export function formatSquareKm(squareKm: number): string {
  return unit('squareKm', whole(squareKm));
}

export function formatVolts(volts: number): string {
  return unit('volts', whole(volts));
}

export function formatGramsPerKwh(grams: number): string {
  return unit('gramsPerKwh', formatFixed(grams, TENTHS));
}

export function formatMonths(months: number): string {
  return unit('months', formatFixed(months, TENTHS));
}

export function formatSpacing(diameters: number): string {
  return t('chapters.farm.spacingValue', {
    metres: whole(diameters * ROTOR_DIAMETER_M),
    diameters: formatNumber(diameters),
  });
}

export function formatSweptArea(): string {
  return t('chapters.tower.sweptValue', {
    area: whole(SWEPT_AREA_M2),
    pitches: formatFixed(sweptPitches(), TENTHS),
  });
}

export function formatGearRatio(ratio: number): string {
  return t('chapters.nacelle.gearValue', { ratio: formatNumber(roundTo(ratio, GEAR_RATIO_STEP)) });
}

export function formatBrake(braked: boolean): string {
  return t(`chapters.nacelle.brakeValue.${braked ? 'holding' : 'released'}`);
}

export function formatOperatingState(state: OperatingStateId): string {
  return t(`readouts.state.${state}`);
}

export function formatVoltages(): string {
  return t('chapters.grid.voltagesValue', {
    generator: whole(GENERATOR_VOLTS),
    collector: whole(COLLECTOR_KV),
    grid: whole(GRID_KV),
  });
}
