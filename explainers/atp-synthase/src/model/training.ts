import type { TrainingId } from '../ids';

export interface TrainingLevel {
  readonly mitochondriaPercent: number;
  readonly membraneFactor: number;
  readonly motors: number;
}

export const BASE_MOTORS = 4;
export const MAX_MOTORS = 10;

const UNTRAINED_MITOCHONDRIA_PERCENT = 4.8;
const TEN_WEEKS_MITOCHONDRIA_PERCENT = 6.8;
const ATHLETE_MITOCHONDRIA_RATIO = 2.1;
const ATHLETE_CRISTAE_SURFACE_FACTOR = 2.5;
const MOTORS_PER_PAIR = 2;
const UNTRAINED_MEMBRANE_FACTOR = 1;

export function motorsFor(membraneFactor: number): number {
  const pairs = Math.round((BASE_MOTORS * membraneFactor) / MOTORS_PER_PAIR);
  return Math.min(MAX_MOTORS, pairs * MOTORS_PER_PAIR);
}

function level(mitochondriaPercent: number, membraneFactor: number): TrainingLevel {
  return { mitochondriaPercent, membraneFactor, motors: motorsFor(membraneFactor) };
}

export const TRAINING: Readonly<Record<TrainingId, TrainingLevel>> = {
  untrained: level(UNTRAINED_MITOCHONDRIA_PERCENT, UNTRAINED_MEMBRANE_FACTOR),
  tenWeeks: level(
    TEN_WEEKS_MITOCHONDRIA_PERCENT,
    TEN_WEEKS_MITOCHONDRIA_PERCENT / UNTRAINED_MITOCHONDRIA_PERCENT,
  ),
  years: level(
    Math.round(UNTRAINED_MITOCHONDRIA_PERCENT * ATHLETE_MITOCHONDRIA_RATIO),
    ATHLETE_CRISTAE_SURFACE_FACTOR,
  ),
};

export function trainingLevel(training: TrainingId): TrainingLevel {
  return TRAINING[training];
}
