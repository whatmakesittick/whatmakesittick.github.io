import { formatFixed, formatNumber } from '@core/format';
import { t } from '@core/i18n';
import { slowMotionFactor } from '@core/playback';
import type { PhaseId, SiteState } from '../ids';
import { REAL_TIME_SPEED, REAL_TURNS_PER_SECOND, isSingleValue, phaseAt } from '../model';
import type { PercentRange } from '../model';

const REAL_TIME_FORMAT = '×1';
const SLOWER_PREFIX = '1/';
const OXYGEN_DIGITS = 2;
const PER_MINUTE_DIGITS = 2;
const PER_HOUR_DIGITS = 1;
const FACTOR_DIGITS = 1;
const PER_ATP_DIGITS = 1;

export const PHASE_KEYS: Record<PhaseId, string> = {
  firstAtp: 'timeline.phase.firstAtp',
  secondAtp: 'timeline.phase.secondAtp',
  thirdAtp: 'timeline.phase.thirdAtp',
};

export const JUMP_KEYS: Record<PhaseId, string> = {
  firstAtp: 'timeline.jump.firstAtp',
  secondAtp: 'timeline.jump.secondAtp',
  thirdAtp: 'timeline.jump.thirdAtp',
};

const DURING_KEYS: Record<PhaseId, string> = {
  firstAtp: 'timeline.during.firstAtp',
  secondAtp: 'timeline.during.secondAtp',
  thirdAtp: 'timeline.during.thirdAtp',
};

const SITE_DOING_KEYS: Record<SiteState, string> = {
  open: 'sites.doing.open',
  loose: 'sites.doing.loose',
  tight: 'sites.doing.tight',
};

export function formatDegrees(degrees: number): string {
  return t('units.degrees', { value: formatNumber(degrees) });
}

export function formatPhase(phase: number): string {
  return formatDegrees(Math.floor(phase));
}

export function describePhase(phase: number): string {
  return t('timeline.value', {
    angle: formatPhase(phase),
    phase: t(DURING_KEYS[phaseAt(phase)]),
  });
}

export function formatSpeed(speed: number): string {
  if (speed === REAL_TIME_SPEED) return REAL_TIME_FORMAT;
  return `${SLOWER_PREFIX}${slowMotionFactor(speed, REAL_TIME_SPEED)}`;
}

export function describeSpeed(speed: number): string {
  if (speed === REAL_TIME_SPEED) {
    return t('timeline.realTime', { value: formatNumber(REAL_TURNS_PER_SECOND) });
  }
  return t('timeline.slower', {
    factor: formatNumber(slowMotionFactor(speed, REAL_TIME_SPEED)),
  });
}

export function formatCount(count: number): string {
  return formatNumber(count);
}

export function formatDecimal(value: number): string {
  return formatNumber(value);
}

export function formatPerAtp(protons: number): string {
  return formatFixed(protons, PER_ATP_DIGITS);
}

export function formatOxygen(litresPerMinute: number): string {
  return t('units.litresPerMinute', { value: formatFixed(litresPerMinute, OXYGEN_DIGITS) });
}

export function formatKilogramsPerMinute(kilograms: number): string {
  return t('units.kilograms', { value: formatFixed(kilograms, PER_MINUTE_DIGITS) });
}

export function formatKilogramsPerHour(kilograms: number): string {
  return t('units.kilograms', { value: formatFixed(kilograms, PER_HOUR_DIGITS) });
}

export function formatTimes(factor: number): string {
  return t('units.times', { value: formatFixed(factor, FACTOR_DIGITS) });
}

export function formatPercent(percent: number): string {
  return t('units.percent', { value: formatNumber(percent) });
}

export function formatPercentRange(range: PercentRange): string {
  if (isSingleValue(range)) return formatPercent(range.low);
  return t('units.percentRange', {
    low: formatNumber(range.low),
    high: formatNumber(range.high),
  });
}

export function describeSite(state: SiteState): string {
  return t(SITE_DOING_KEYS[state]);
}
