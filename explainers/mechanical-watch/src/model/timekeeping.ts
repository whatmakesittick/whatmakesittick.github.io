import { FULL_TURN, clamp, toRadians } from '@core/math';
import type { BeatRateId } from '../ids';
import { SECONDS_PER_DAY, SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from './kinematics';
import { BALANCE, HAIRSPRING, REGULATOR } from './layout';
import { averagePowerMicroW } from './mainspring';
import { BEATS_PER_HOUR, BEATS_PER_TOOTH, ESCAPE_TEETH, OSCILLATION_PERIOD_S } from './train';

export const MAX_REGULATOR_INDEX = 1;
export const COSC_RATE_BAND = { min: -4, max: 6 } as const;

export const BEAT_RATE_VPH: Readonly<Record<BeatRateId, number>> = {
  vph18000: 18_000,
  vph21600: 21_600,
  vph28800: 28_800,
  vph36000: 36_000,
};

const PERIOD_PER_LENGTH_EXPONENT = 0.5;
const KINETIC_ENERGY_FACTOR = 0.5;
const BEATS_PER_OSCILLATION = 2;
const MILLISECONDS_PER_SECOND = 1000;
const MICROJOULES_PER_JOULE = 1e6;
const KILOGRAMS_PER_MILLIGRAM = 1e-6;
const SQUARE_METRES_PER_SQUARE_CENTIMETRE = 1e-4;

export interface BeatRateFacts {
  readonly vph: number;
  readonly hz: number;
  readonly beatsPerSecond: number;
  readonly beatsPerDay: number;
  readonly escapeWheelRpm: number;
  readonly secondStepsPerSecond: number;
}

function indexWithin(index: number): number {
  return clamp(index, -MAX_REGULATOR_INDEX, MAX_REGULATOR_INDEX);
}

export function hairspringLengthMm(): number {
  const meanRadius = (HAIRSPRING.innerRadiusMm + HAIRSPRING.outerRadiusMm) / 2;
  return HAIRSPRING.coils * FULL_TURN * meanRadius;
}

export function regulatorArcMm(): number {
  return HAIRSPRING.outerRadiusMm * toRadians(REGULATOR.indexRangeDeg);
}

export function activeLengthChangeMm(index: number): number {
  return -indexWithin(index) * regulatorArcMm();
}

export function activeLengthMm(index: number): number {
  return hairspringLengthMm() + activeLengthChangeMm(index);
}

export function dailyRate(index: number): number {
  const periodChange =
    PERIOD_PER_LENGTH_EXPONENT * (activeLengthChangeMm(index) / hairspringLengthMm());
  return -SECONDS_PER_DAY * periodChange;
}

export function isWithinCosc(rate: number): boolean {
  return rate >= COSC_RATE_BAND.min && rate <= COSC_RATE_BAND.max;
}

export function periodMs(index: number): number {
  return OSCILLATION_PERIOD_S * MILLISECONDS_PER_SECOND * (1 - dailyRate(index) / SECONDS_PER_DAY);
}

export function frequencyHz(index: number): number {
  return MILLISECONDS_PER_SECOND / periodMs(index);
}

function balanceInertia(): number {
  return BALANCE.inertiaMgCm2 * KILOGRAMS_PER_MILLIGRAM * SQUARE_METRES_PER_SQUARE_CENTIMETRE;
}

export function balanceEnergyMicroJ(amplitudeDeg: number): number {
  const peakSpeed = (toRadians(amplitudeDeg) * FULL_TURN) / OSCILLATION_PERIOD_S;
  return KINETIC_ENERGY_FACTOR * balanceInertia() * peakSpeed * peakSpeed * MICROJOULES_PER_JOULE;
}

export function energyPerBeatMicroJ(): number {
  return averagePowerMicroW() / (BEATS_PER_HOUR / SECONDS_PER_HOUR);
}

export function beatRateFacts(id: BeatRateId): BeatRateFacts {
  const vph = BEAT_RATE_VPH[id];
  const beatsPerSecond = vph / SECONDS_PER_HOUR;
  return {
    vph,
    hz: beatsPerSecond / BEATS_PER_OSCILLATION,
    beatsPerSecond,
    beatsPerDay: beatsPerSecond * SECONDS_PER_DAY,
    escapeWheelRpm: (beatsPerSecond * SECONDS_PER_MINUTE) / (ESCAPE_TEETH * BEATS_PER_TOOTH),
    secondStepsPerSecond: beatsPerSecond,
  };
}
