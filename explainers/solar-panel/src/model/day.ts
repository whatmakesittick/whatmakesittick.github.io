import type { PhaseId, SunMomentId } from '../ids';
import { PHASE_IDS } from '../ids';

export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 1440;
export const DAY_START_MIN = 300;
export const DAY_END_MIN = 1140;
export const DAY_CYCLE_MIN = DAY_END_MIN - DAY_START_MIN;
export const SUNRISE_MIN = 360;
export const SOLAR_NOON_MIN = 720;
export const SUNSET_MIN = 1080;

export interface PhaseRange {
  start: number;
  end: number;
}

export const PHASE_RANGES: Record<PhaseId, PhaseRange> = {
  dawn: { start: 0, end: 120 },
  morning: { start: 120, end: 300 },
  noon: { start: 300, end: 540 },
  afternoon: { start: 540, end: 720 },
  dusk: { start: 720, end: DAY_CYCLE_MIN },
};

export const SUN_MOMENTS: Record<SunMomentId, number> = {
  sunrise: 90,
  noon: 420,
  sunset: 750,
};

const AMBIENT = { meanC: 15, swingC: 5, warmestMinute: 900 } as const;

export function minuteOfDay(phase: number): number {
  return DAY_START_MIN + phase;
}

export function phaseOfMinute(minute: number): number {
  return minute - DAY_START_MIN;
}

export function phaseAt(phase: number): PhaseId {
  const found = PHASE_IDS.find((id) => phase < PHASE_RANGES[id].end);
  return found ?? PHASE_IDS[PHASE_IDS.length - 1];
}

export function isDaylight(minute: number): boolean {
  return minute > SUNRISE_MIN && minute < SUNSET_MIN;
}

export function clockParts(minute: number): { hours: number; minutes: number } {
  const wrapped = ((minute % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return {
    hours: Math.floor(wrapped / MINUTES_PER_HOUR),
    minutes: Math.floor(wrapped % MINUTES_PER_HOUR),
  };
}

export function ambientTemperatureC(minute: number): number {
  const angle = (2 * Math.PI * (minute - AMBIENT.warmestMinute)) / MINUTES_PER_DAY;
  return AMBIENT.meanC + AMBIENT.swingC * Math.cos(angle);
}
