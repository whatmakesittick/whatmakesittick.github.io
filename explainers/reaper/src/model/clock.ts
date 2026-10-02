import { MISSION_END_MIN, minutesAt } from './mission';

export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;

export interface ClockReading {
  hours: number;
  minutes: number;
  seconds: number;
}

export interface HoursMinutes {
  hours: number;
  minutes: number;
}

export function clockAt(missionMinutes: number): ClockReading {
  const totalSeconds = Math.round(missionMinutes * SECONDS_PER_MINUTE);
  const totalMinutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  return {
    hours: Math.floor(totalMinutes / MINUTES_PER_HOUR),
    minutes: totalMinutes % MINUTES_PER_HOUR,
    seconds: totalSeconds % SECONDS_PER_MINUTE,
  };
}

export function hoursAndMinutes(hours: number): HoursMinutes {
  const totalMinutes = Math.round(hours * MINUTES_PER_HOUR);
  return {
    hours: Math.floor(totalMinutes / MINUTES_PER_HOUR),
    minutes: totalMinutes % MINUTES_PER_HOUR,
  };
}

export function missionShareAt(units: number): number {
  return minutesAt(units) / MISSION_END_MIN;
}
