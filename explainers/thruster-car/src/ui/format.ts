import { formatFixed } from '@core/format';
import { t } from '@core/i18n';
import { NEWTONS_PER_KILONEWTON, toKmh } from '../model';
import type { RunOutcome } from '../state';

export const WHOLE = 0;
export const TENTHS = 1;
export const HUNDREDTHS = 2;

const PERCENT = 100;
const MEGAJOULES_PER_KWH = 3.6;

function unit(key: string, value: number, digits: number): string {
  return t(`units.${key}`, { value: formatFixed(value, digits) });
}

export function formatPercent(share: number): string {
  return unit('percent', share * PERCENT, WHOLE);
}

export function formatBar(bar: number): string {
  return unit('bar', bar, WHOLE);
}

export function formatKilonewtons(kilonewtons: number, digits: number): string {
  return unit('kilonewtons', kilonewtons, digits);
}

export function formatThrust(newtons: number): string {
  return formatKilonewtons(newtons / NEWTONS_PER_KILONEWTON, TENTHS);
}

export function formatMassFlow(kgPerSecond: number, digits: number): string {
  return unit('kgPerSecond', kgPerSecond, digits);
}

export function formatKilograms(kilograms: number): string {
  return unit('kilograms', kilograms, WHOLE);
}

export function formatMetres(metres: number, digits: number): string {
  return unit('metres', metres, digits);
}

export function formatSpeedMs(metresPerSecond: number, digits: number): string {
  return unit('metresPerSecond', metresPerSecond, digits);
}

export function formatKmh(metresPerSecond: number): string {
  return unit('kmh', toKmh(metresPerSecond), WHOLE);
}

export function formatSeconds(seconds: number, digits: number): string {
  return unit('seconds', seconds, digits);
}

export function formatMinutes(minutes: number): string {
  return unit('minutes', minutes, WHOLE);
}

export function formatGees(gees: number): string {
  return unit('gees', gees, TENTHS);
}

export function formatMegawatts(megawatts: number): string {
  return unit('megawatts', megawatts, TENTHS);
}

export function formatImpulse(kilonewtonSeconds: number): string {
  return unit('kilonewtonSeconds', kilonewtonSeconds, WHOLE);
}

export function formatTorque(newtonMetres: number): string {
  return unit('kilonewtonMetres', newtonMetres / NEWTONS_PER_KILONEWTON, TENTHS);
}

export function formatInertia(kgSquareMetres: number): string {
  return unit('kgm2', kgSquareMetres, WHOLE);
}

export function formatRollRate(degreesPerSecond: number): string {
  return unit('degreesPerSecond', degreesPerSecond, WHOLE);
}

export function formatWork(megajoules: number): string {
  return t('units.megajoulesPair', {
    mj: formatFixed(megajoules, WHOLE),
    kwh: formatFixed(megajoules / MEGAJOULES_PER_KWH, TENTHS),
  });
}

export function formatOutcome({ ranDry, emptyAtSeconds, touchdownMs }: RunOutcome): string {
  const speed = formatFixed(touchdownMs, TENTHS);
  if (!ranDry || emptyAtSeconds === null)
    return t('chapters.limits.outcomeState.cushioned', { speed });
  return t('chapters.limits.outcomeState.ranDry', {
    seconds: formatFixed(emptyAtSeconds, TENTHS),
    speed,
  });
}
