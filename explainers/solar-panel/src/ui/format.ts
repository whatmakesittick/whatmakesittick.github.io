import { formatNumber } from '@core/format';
import { t } from '@core/i18n';
import type { PhaseId } from '../ids';
import { DAY_CYCLE_MIN, clockParts, minuteOfDay, phaseAt } from '../model';

export const NO_VALUE = '–';

const CLOCK_DIGITS = 2;
const CLOCK_PAD = '0';

export const PHASE_KEYS: Record<PhaseId, string> = {
  dawn: 'timeline.phase.dawn',
  morning: 'timeline.phase.morning',
  noon: 'timeline.phase.noon',
  afternoon: 'timeline.phase.afternoon',
  dusk: 'timeline.phase.dusk',
};

export const JUMP_KEYS: Record<PhaseId, string> = {
  dawn: 'timeline.jump.dawn',
  morning: 'timeline.jump.morning',
  noon: 'timeline.jump.noon',
  afternoon: 'timeline.jump.afternoon',
  dusk: 'timeline.jump.dusk',
};

const DURING_KEYS: Record<PhaseId, string> = {
  dawn: 'timeline.during.dawn',
  morning: 'timeline.during.morning',
  noon: 'timeline.during.noon',
  afternoon: 'timeline.during.afternoon',
  dusk: 'timeline.during.dusk',
};

function twoDigits(value: number): string {
  return String(value).padStart(CLOCK_DIGITS, CLOCK_PAD);
}

export function formatPhase(phase: number): string {
  const { hours, minutes } = clockParts(minuteOfDay(phase));
  return `${twoDigits(hours)}:${twoDigits(minutes)}`;
}

export function describePhase(phase: number): string {
  return t('timeline.value', { time: formatPhase(phase), phase: t(DURING_KEYS[phaseAt(phase)]) });
}

export function formatSpeed(minutesPerSecond: number): string {
  return t('timeline.speedValue', { minutes: formatNumber(minutesPerSecond) });
}

export function describeSpeed(minutesPerSecond: number): string {
  return t('timeline.speedDescription', {
    minutes: formatNumber(minutesPerSecond),
    seconds: formatNumber(Math.round(DAY_CYCLE_MIN / minutesPerSecond)),
  });
}
