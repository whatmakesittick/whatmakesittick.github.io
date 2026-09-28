import { BEAT_MS, RESTING_RATE_PER_MINUTE, STROKE_ML } from './cycle';

export const REST_HEART_RATE = RESTING_RATE_PER_MINUTE;
export const MAX_HEART_RATE = 190;
export const REST_STROKE_ML = STROKE_ML;
export const MAX_STROKE_ML = 105;
export const REST_SYSTOLE_MS = 320;
export const BLOOD_VOLUME_L = 5;

const STROKE_PLATEAU_EFFORT = 0.5;
const MS_PER_MINUTE = 60_000;
const ML_PER_LITRE = 1000;
const SECONDS_PER_MINUTE = 60;

export function heartRate(effort: number): number {
  return REST_HEART_RATE + (MAX_HEART_RATE - REST_HEART_RATE) * effort;
}

export function strokeVolume(effort: number): number {
  const untilPlateau = 1 - Math.min(effort / STROKE_PLATEAU_EFFORT, 1);
  return REST_STROKE_ML + (MAX_STROKE_ML - REST_STROKE_ML) * (1 - untilPlateau * untilPlateau);
}

export function cardiacOutput(effort: number): number {
  return (heartRate(effort) * strokeVolume(effort)) / ML_PER_LITRE;
}

export function beatLength(ratePerMinute: number): number {
  return MS_PER_MINUTE / ratePerMinute;
}

export function systoleLength(ratePerMinute: number): number {
  return REST_SYSTOLE_MS * Math.sqrt(beatLength(ratePerMinute) / BEAT_MS);
}

export function diastoleLength(ratePerMinute: number): number {
  return beatLength(ratePerMinute) - systoleLength(ratePerMinute);
}

export function roundTripSeconds(litresPerMinute: number): number {
  return (BLOOD_VOLUME_L / litresPerMinute) * SECONDS_PER_MINUTE;
}
