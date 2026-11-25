import { clamp } from '@core/math';

export const STEP_RATE_RANGE = { min: -10, max: 10, step: 1, default: 0 } as const;

interface HeiderscheitRow {
  stepRate: number;
  kneeLandDeg: number;
  kneePeakDeg: number;
  hipPeakDeg: number;
  comToHeelCm: number;
  comExcursionCm: number;
  brakingImpulse: number;
  peakVerticalNPerKg: number;
  kneeEnergyJPerKg: number;
}

const ROWS: readonly HeiderscheitRow[] = [
  {
    stepRate: -10,
    kneeLandDeg: 16.9,
    kneePeakDeg: 50.6,
    hipPeakDeg: 30.7,
    comToHeelCm: 11.4,
    comExcursionCm: 10.7,
    brakingImpulse: 382.4,
    peakVerticalNPerKg: 24.2,
    kneeEnergyJPerKg: 13.5,
  },
  {
    stepRate: -5,
    kneeLandDeg: 17.0,
    kneePeakDeg: 48.0,
    hipPeakDeg: 27.9,
    comToHeelCm: 10.2,
    comExcursionCm: 9.6,
    brakingImpulse: 337.2,
    peakVerticalNPerKg: 24.0,
    kneeEnergyJPerKg: 11.1,
  },
  {
    stepRate: 0,
    kneeLandDeg: 17.8,
    kneePeakDeg: 46.3,
    hipPeakDeg: 26.7,
    comToHeelCm: 9.2,
    comExcursionCm: 8.7,
    brakingImpulse: 306.0,
    peakVerticalNPerKg: 23.6,
    kneeEnergyJPerKg: 9.2,
  },
  {
    stepRate: 5,
    kneeLandDeg: 18.7,
    kneePeakDeg: 44.1,
    hipPeakDeg: 25.3,
    comToHeelCm: 7.8,
    comExcursionCm: 8.0,
    brakingImpulse: 274.1,
    peakVerticalNPerKg: 23.4,
    kneeEnergyJPerKg: 7.4,
  },
  {
    stepRate: 10,
    kneeLandDeg: 19.6,
    kneePeakDeg: 42.8,
    hipPeakDeg: 23.6,
    comToHeelCm: 7.0,
    comExcursionCm: 7.3,
    brakingImpulse: 256.7,
    peakVerticalNPerKg: 23.0,
    kneeEnergyJPerKg: 6.1,
  },
];

const PREFERRED = ROWS[2];

export interface StepRateEffect {
  kneeLandDeg: number;
  kneePeakDeg: number;
  hipPeakDeg: number;
  reachCm: number;
  bounceFactor: number;
  brakingImpulseFactor: number;
  kneeEnergyFactor: number;
  verticalForceFactor: number;
}

function effectOf(row: HeiderscheitRow): StepRateEffect {
  return {
    kneeLandDeg: row.kneeLandDeg - PREFERRED.kneeLandDeg,
    kneePeakDeg: row.kneePeakDeg - PREFERRED.kneePeakDeg,
    hipPeakDeg: row.hipPeakDeg - PREFERRED.hipPeakDeg,
    reachCm: row.comToHeelCm - PREFERRED.comToHeelCm,
    bounceFactor: row.comExcursionCm / PREFERRED.comExcursionCm,
    brakingImpulseFactor: row.brakingImpulse / PREFERRED.brakingImpulse,
    kneeEnergyFactor: row.kneeEnergyJPerKg / PREFERRED.kneeEnergyJPerKg,
    verticalForceFactor: row.peakVerticalNPerKg / PREFERRED.peakVerticalNPerKg,
  };
}

const EFFECTS = ROWS.map(effectOf);

function mix(a: number, b: number, share: number): number {
  return a + (b - a) * share;
}

function interpolatedEffect(stepRate: number): StepRateEffect {
  const clamped = clamp(stepRate, STEP_RATE_RANGE.min, STEP_RATE_RANGE.max);
  const upper = Math.max(
    1,
    ROWS.findIndex((row) => row.stepRate >= clamped),
  );
  const lower = upper - 1;
  const share = (clamped - ROWS[lower].stepRate) / (ROWS[upper].stepRate - ROWS[lower].stepRate);
  const from = EFFECTS[lower];
  const to = EFFECTS[upper];
  return {
    kneeLandDeg: mix(from.kneeLandDeg, to.kneeLandDeg, share),
    kneePeakDeg: mix(from.kneePeakDeg, to.kneePeakDeg, share),
    hipPeakDeg: mix(from.hipPeakDeg, to.hipPeakDeg, share),
    reachCm: mix(from.reachCm, to.reachCm, share),
    bounceFactor: mix(from.bounceFactor, to.bounceFactor, share),
    brakingImpulseFactor: mix(from.brakingImpulseFactor, to.brakingImpulseFactor, share),
    kneeEnergyFactor: mix(from.kneeEnergyFactor, to.kneeEnergyFactor, share),
    verticalForceFactor: mix(from.verticalForceFactor, to.verticalForceFactor, share),
  };
}

let lastStepRate = Number.NaN;
let lastEffect: StepRateEffect | null = null;

export function stepRateEffect(stepRate: number): StepRateEffect {
  if (lastEffect && stepRate === lastStepRate) return lastEffect;
  lastStepRate = stepRate;
  lastEffect = interpolatedEffect(stepRate);
  return lastEffect;
}
