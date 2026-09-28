import { formatFixed, formatNumber, formatSigned } from '@core/format';
import { t } from '@core/i18n';
import type { PhaseId } from '../ids';
import {
  ADVANCE_PER_BEAT_DEG,
  DEFAULT_AMPLITUDE,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
  formatTimeOnDial,
  phaseAt,
  slowMotionFactor,
} from '../model';

export const NO_VALUE = '–';

const REAL_TIME_SPEED = 0;
const REAL_TIME_FORMAT = '×1';
const SLOWER_PREFIX = '1/';
const MULTIPLY_SIGN = '×';
const TENTHS = 10;

export const PHASE_KEYS: Record<PhaseId, string> = {
  swingIn: 'timeline.phase.swingIn',
  tick: 'timeline.phase.tick',
  swingOut: 'timeline.phase.swingOut',
  swingBack: 'timeline.phase.swingBack',
  tock: 'timeline.phase.tock',
  swingHome: 'timeline.phase.swingHome',
};

export const JUMP_KEYS: Record<PhaseId, string> = {
  swingIn: 'timeline.jump.swingIn',
  tick: 'timeline.jump.tick',
  swingOut: 'timeline.jump.swingOut',
  swingBack: 'timeline.jump.swingBack',
  tock: 'timeline.jump.tock',
  swingHome: 'timeline.jump.swingHome',
};

const DURING_KEYS: Record<PhaseId, string> = {
  swingIn: 'timeline.during.swingIn',
  tick: 'timeline.during.tick',
  swingOut: 'timeline.during.swingOut',
  swingBack: 'timeline.during.swingBack',
  tock: 'timeline.during.tock',
  swingHome: 'timeline.during.swingHome',
};

const TURN_VALUE_KEYS = {
  hours: 'sections.train.turnValue.hours',
  minutes: 'sections.train.turnValue.minutes',
  seconds: 'sections.train.turnValue.seconds',
} as const;

function toTenths(value: number): number {
  return Math.round(value * TENTHS) / TENTHS;
}

export function formatDegrees(degrees: number, digits = 0): string {
  return t('units.degrees', { value: formatFixed(degrees, digits) });
}

export function formatSignedDegrees(degrees: number, digits = 0): string {
  return t('units.degrees', { value: formatSigned(degrees, digits) });
}

export function formatPhase(phase: number): string {
  return formatDegrees(Math.floor(phase));
}

export function describePhase(phase: number): string {
  return t('timeline.value', {
    angle: formatPhase(phase),
    phase: t(DURING_KEYS[phaseAt(phase, DEFAULT_AMPLITUDE)]),
  });
}

export function formatSpeed(speed: number): string {
  if (speed === REAL_TIME_SPEED) return REAL_TIME_FORMAT;
  return `${SLOWER_PREFIX}${formatNumber(slowMotionFactor(speed))}`;
}

export function describeSpeed(speed: number): string {
  if (speed === REAL_TIME_SPEED) return t('timeline.realTime');
  return t('timeline.slower', { factor: formatNumber(slowMotionFactor(speed)) });
}

export function formatHours(hours: number): string {
  return t('units.hours', { value: formatNumber(toTenths(hours)) });
}

export function formatTorque(milliNewtonMetres: number): string {
  return t('units.mNm', { value: formatFixed(milliNewtonMetres, 1) });
}

export function formatTurns(turns: number): string {
  return t('units.turns', { value: formatFixed(turns, 2) });
}

export function formatJoules(joules: number): string {
  return t('units.joules', { value: formatFixed(joules, 2) });
}

export function formatMicroJoules(microJoules: number): string {
  return t('units.microJoules', { value: formatFixed(microJoules, 1) });
}

export function formatMilliseconds(milliseconds: number, digits: number): string {
  return t('units.ms', { value: formatFixed(milliseconds, digits) });
}

export function formatMillimetres(millimetres: number): string {
  return t('units.mm', { value: formatFixed(millimetres, 1) });
}

export function formatRate(secondsPerDay: number): string {
  return t('units.secondsPerDay', { value: formatSigned(secondsPerDay, 1) });
}

export function formatRegulatorIndex(index: number): string {
  return formatSigned(index, 2);
}

export function formatCount(count: number): string {
  return formatNumber(count);
}

export function formatRpm(rpm: number): string {
  return t('units.rpm', { value: formatNumber(rpm) });
}

export function formatTurnPeriod(seconds: number): string {
  if (seconds >= SECONDS_PER_HOUR) {
    return t(TURN_VALUE_KEYS.hours, { value: formatNumber(seconds / SECONDS_PER_HOUR) });
  }
  if (seconds >= SECONDS_PER_MINUTE) {
    return t(TURN_VALUE_KEYS.minutes, { value: formatNumber(seconds / SECONDS_PER_MINUTE) });
  }
  return t(TURN_VALUE_KEYS.seconds, { value: formatNumber(seconds) });
}

export function formatStepUp(ratio: number | null): string {
  return ratio === null ? NO_VALUE : `${MULTIPLY_SIGN} ${formatNumber(ratio)}`;
}

export function formatTeeth(teeth: number, leaves: number | null): string {
  const pinion = leaves === null ? NO_VALUE : formatNumber(leaves);
  return `${formatNumber(teeth)} / ${pinion}`;
}

export function formatEscapeAdvance(degrees: number): string {
  return t('sections.escapement.wheelValue', {
    done: formatFixed(degrees, 1),
    total: formatNumber(ADVANCE_PER_BEAT_DEG),
  });
}

export function formatDialTime(seconds: number): string {
  return t('readouts.timeValue', { value: formatTimeOnDial(seconds) });
}
