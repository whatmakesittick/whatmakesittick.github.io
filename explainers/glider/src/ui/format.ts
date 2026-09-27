import { formatFixed, formatSigned } from '@core/format';
import { t } from '@core/i18n';
import { formatClock, phaseAt } from '../model';
import type { GliderType, PhaseId } from '../model';

export const PHASE_KEYS: Record<PhaseId, string> = {
  thermal: 'timeline.phase.thermal',
  glide: 'timeline.phase.glide',
  ridge: 'timeline.phase.ridge',
  wave: 'timeline.phase.wave',
  final: 'timeline.phase.final',
};

const DURING_KEYS: Record<PhaseId, string> = {
  thermal: 'timeline.during.thermal',
  glide: 'timeline.during.glide',
  ridge: 'timeline.during.ridge',
  wave: 'timeline.during.wave',
  final: 'timeline.during.final',
};

export function describeFlightTime(phase: number): string {
  return t('timeline.value', { time: formatClock(phase), phase: t(DURING_KEYS[phaseAt(phase)]) });
}

export function formatTimeLapse(speed: number): string {
  return t('units.times', { value: formatFixed(speed, 0) });
}

export function describeTimeLapse(speed: number): string {
  return t('timeline.speedValue', { value: formatFixed(speed, 0) });
}

const RATE_DIGITS = 1;
const KILOMETRES_PER_GLIDE_RATIO = 1;

export const GLIDER_KEYS: Record<GliderType, string> = {
  trainer: 'controls.gliderOptions.trainer',
  racer15: 'controls.gliderOptions.racer15',
  racer18: 'controls.gliderOptions.racer18',
};

export function formatMetres(metres: number): string {
  return t('units.m', { value: formatFixed(metres, 0) });
}

export function formatSpeed(kmh: number): string {
  return t('units.kmh', { value: formatFixed(kmh, 0) });
}

export function formatRate(metresPerSecond: number): string {
  return t('units.ms', { value: formatFixed(metresPerSecond, RATE_DIGITS) });
}

export function formatSignedRate(metresPerSecond: number): string {
  return t('units.ms', { value: formatSigned(metresPerSecond, RATE_DIGITS) });
}

export function formatRatio(ratio: number): string {
  return t('units.ratio', { value: formatFixed(Math.round(ratio), 0) });
}

export function formatReach(ratio: number): string {
  return t('units.km', { value: formatFixed(Math.round(ratio * KILOMETRES_PER_GLIDE_RATIO), 0) });
}

export function formatCelsius(degrees: number): string {
  return t('units.celsius', { value: formatFixed(degrees, 0) });
}
