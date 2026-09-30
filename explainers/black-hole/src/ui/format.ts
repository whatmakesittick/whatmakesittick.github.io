import { formatFixed, formatNumber } from '@core/format';
import { t } from '@core/i18n';
import { PHASE_IDS } from '../ids';
import type { FlashTone, PhaseId } from '../ids';
import { phaseIdAt } from '../model';
import type { BlackHole } from '../model';
import { REAL_TIME_SPEED, playbackFactor } from '../playback';

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_DAY = 86_400;
const MILLISECONDS_PER_SECOND = 1000;
const CLOCK_DIGITS = 2;
const CLOCK_PAD = '0';
const WHOLE = 0;
const TENTHS = 1;
const HUNDREDTHS = 2;
const PERCENT = 100;
const MILLION = 1e6;
const BILLION = 1e9;
const TIMES_SUFFIX = '×';
const RATIO_DECIMAL_LIMIT = 10;
const PERCENT_DECIMAL_LIMIT = 10;
const TIDE_FLOOR_G = 1e-4;
const TIDE_MILLION_G = 1e5;
const SIGNIFICANT_DIGITS = 2;

function phaseKeys(group: string): Readonly<Record<PhaseId, string>> {
  return Object.fromEntries(PHASE_IDS.map((id) => [id, `timeline.${group}.${id}`])) as Record<
    PhaseId,
    string
  >;
}

export const PHASE_KEYS = phaseKeys('phase');
export const JUMP_KEYS = phaseKeys('jump');
const DURING_KEYS = phaseKeys('during');

function whole(value: number): string {
  return formatFixed(value, WHOLE);
}

function tenths(value: number): string {
  return formatFixed(value, TENTHS);
}

function fractionDigitsOf(value: number): number {
  return String(value).split('.')[1]?.length ?? 0;
}

function significant(value: number): string {
  const rounded = Number(value.toPrecision(SIGNIFICANT_DIGITS));
  return formatFixed(rounded, fractionDigitsOf(rounded));
}

export function formatClock(seconds: number): string {
  const elapsed = Math.floor(seconds);
  return t('timeline.clock', {
    minutes: Math.floor(elapsed / SECONDS_PER_MINUTE),
    seconds: String(elapsed % SECONDS_PER_MINUTE).padStart(CLOCK_DIGITS, CLOCK_PAD),
  });
}

export function formatShipClock(seconds: number): string {
  return Number.isFinite(seconds) ? formatClock(seconds) : t('clocks.never');
}

export function formatPhase(phase: number): string {
  return formatClock(phase);
}

export function describePhase(phase: number): string {
  return t('timeline.value', { time: formatPhase(phase), phase: t(DURING_KEYS[phaseIdAt(phase)]) });
}

export function formatSpeed(speed: number): string {
  return `${formatNumber(playbackFactor(speed))}${TIMES_SUFFIX}`;
}

export function describeSpeed(speed: number): string {
  if (speed === REAL_TIME_SPEED) return t('timeline.realTime');
  return t('timeline.faster', { factor: formatNumber(playbackFactor(speed)) });
}

export function formatRatioValue(ratio: number): string {
  if (!Number.isFinite(ratio)) return t('clocks.infinite');
  return ratio < RATIO_DECIMAL_LIMIT ? tenths(ratio) : whole(ratio);
}

export function formatRatio(ratio: number): string {
  if (!Number.isFinite(ratio)) return t('clocks.infinite');
  return t('units.times', { value: formatRatioValue(ratio) });
}

export function formatDistance(radius: number): string {
  return t('units.horizonRadii', { value: tenths(radius) });
}

export function formatLightSpeed(share: number): string {
  return t('units.lightSpeed', { value: formatFixed(share, HUNDREDTHS) });
}

export function formatTide(stretchG: number): string {
  if (stretchG < TIDE_FLOOR_G) return t('units.gBelow', { value: significant(TIDE_FLOOR_G) });
  if (stretchG > TIDE_MILLION_G)
    return t('units.millionG', { value: significant(stretchG / MILLION) });
  return t('units.g', { value: significant(stretchG) });
}

export function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds)) return t('clocks.infinite');
  return t('units.seconds', { value: whole(seconds) });
}

export function formatPercent(share: number): string {
  const percent = share * PERCENT;
  return t('units.percent', {
    value: percent >= PERCENT_DECIMAL_LIMIT ? whole(percent) : tenths(percent),
  });
}

export function formatFlashTone(tone: FlashTone): string {
  return t(`clocks.flash.${tone}`);
}

export function formatMass(massSolar: number): string {
  if (massSolar >= BILLION) return t('units.billionSuns', { value: tenths(massSolar / BILLION) });
  if (massSolar >= MILLION) return t('units.millionSuns', { value: tenths(massSolar / MILLION) });
  return t('units.suns', { value: whole(massSolar) });
}

export function formatHorizon(rsKm: number): string {
  if (rsKm >= BILLION) return t('units.billionKm', { value: whole(rsKm / BILLION) });
  if (rsKm >= MILLION) return t('units.millionKm', { value: tenths(rsKm / MILLION) });
  return t('units.km', { value: whole(rsKm) });
}

export function formatFallTime(seconds: number): string {
  if (seconds >= SECONDS_PER_DAY)
    return t('units.days', { value: whole(seconds / SECONDS_PER_DAY) });
  if (seconds >= SECONDS_PER_MINUTE) {
    return t('units.minutes', { value: whole(seconds / SECONDS_PER_MINUTE) });
  }
  return t('units.milliseconds', { value: whole(seconds * MILLISECONDS_PER_SECOND) });
}

export function formatComparison(hole: BlackHole): Readonly<Record<string, string>> {
  return {
    mass: formatMass(hole.massSolar),
    horizon: formatHorizon(hole.rsKm),
    fall: formatFallTime(hole.fallSecondsFrom5Rs),
    tide: formatTide(hole.horizonTideG),
  };
}
