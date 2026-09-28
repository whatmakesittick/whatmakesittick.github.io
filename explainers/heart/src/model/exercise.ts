import { AV_VALVES_CLOSE_MS, BEAT_MS, SEMILUNAR_CLOSE_MS } from './cycle';

export const FITNESS_IDS = ['typical', 'athlete'] as const;

export type FitnessId = (typeof FITNESS_IDS)[number];

export interface FitnessProfile {
  readonly restRate: number;
  readonly restStroke: number;
  readonly maxRate: number;
  readonly maxStroke: number;
}

export const FITNESS_PROFILES: Readonly<Record<FitnessId, FitnessProfile>> = {
  typical: { restRate: 75, restStroke: 70, maxRate: 190, maxStroke: 105 },
  athlete: { restRate: 50, restStroke: 105, maxRate: 190, maxStroke: 170 },
};

export const REST_SYSTOLE_MS = SEMILUNAR_CLOSE_MS - AV_VALVES_CLOSE_MS;
export const BLOOD_VOLUME_L = 5;

const STROKE_PLATEAU_EFFORT = 0.5;
const MS_PER_MINUTE = 60_000;
const ML_PER_LITRE = 1000;
const SECONDS_PER_MINUTE = 60;

export function heartRate(fitness: FitnessId, effort: number): number {
  const { restRate, maxRate } = FITNESS_PROFILES[fitness];
  return restRate + (maxRate - restRate) * effort;
}

export function strokeVolume(fitness: FitnessId, effort: number): number {
  const { restStroke, maxStroke } = FITNESS_PROFILES[fitness];
  const untilPlateau = 1 - Math.min(effort / STROKE_PLATEAU_EFFORT, 1);
  return restStroke + (maxStroke - restStroke) * (1 - untilPlateau * untilPlateau);
}

export function cardiacOutput(fitness: FitnessId, effort: number): number {
  return (heartRate(fitness, effort) * strokeVolume(fitness, effort)) / ML_PER_LITRE;
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
