import { AV_VALVES_CLOSE_MS, BEAT_MS, SEMILUNAR_CLOSE_MS } from './cycle';

export const EFFORT_RANGE = { min: 0, max: 1, step: 0.01, default: 0 } as const;

export const FITNESS_IDS = ['typical', 'athlete'] as const;

export type FitnessId = (typeof FITNESS_IDS)[number];

export interface FitnessProfile {
  readonly restRate: number;
  readonly restStroke: number;
  readonly maxRate: number;
  readonly maxStroke: number;
}

export const FITNESS_PROFILES: Readonly<Record<FitnessId, FitnessProfile>> = {
  typical: { restRate: 75, restStroke: 70, maxRate: 190, maxStroke: 110 },
  athlete: { restRate: 50, restStroke: 100, maxRate: 185, maxStroke: 150 },
};

export const REST_SYSTOLE_MS = SEMILUNAR_CLOSE_MS - AV_VALVES_CLOSE_MS;
export const BLOOD_VOLUME_L = 5;

const STROKE_PLATEAU_EFFORT = 0.5;
const MS_PER_MINUTE = 60_000;
const ML_PER_LITRE = 1000;
const SECONDS_PER_MINUTE = 60;

export function heartRate(effort: number, fitness: FitnessId): number {
  const { restRate, maxRate } = FITNESS_PROFILES[fitness];
  return restRate + (maxRate - restRate) * effort;
}

export function strokeVolume(effort: number, fitness: FitnessId): number {
  const { restStroke, maxStroke } = FITNESS_PROFILES[fitness];
  const untilPlateau = 1 - Math.min(effort / STROKE_PLATEAU_EFFORT, 1);
  return restStroke + (maxStroke - restStroke) * (1 - untilPlateau * untilPlateau);
}

export function cardiacOutput(effort: number, fitness: FitnessId): number {
  return (heartRate(effort, fitness) * strokeVolume(effort, fitness)) / ML_PER_LITRE;
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
