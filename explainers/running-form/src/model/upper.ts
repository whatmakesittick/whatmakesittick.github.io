import { FULL_TURN } from '@core/math';
import type { ArmsId, PaceId, UpperReading } from '../ids';
import { GAIT_DATA } from './gaitData';
import { PELVIS_TILT_DEG } from './body';
import { evaluateFit } from './legAngles';
import { CYCLE_UNITS, HALF_CYCLE_UNITS } from './timeMap';

export const LEAN_MEAN_DEG = 7.3;
export const ARM_SWING_AMP_DEG = 25;
export const ELBOW_MEAN_DEG = 90;
export const ELBOW_SWING_DEG = 10;
export const HELD_ELBOW_DEG = 100;
export const HELD_TWIST_GAIN = 1.68;
export const HELD_PELVIS_GAIN = 1.2;

const STEP_UNITS = HALF_CYCLE_UNITS;
const TILT_PEAK_UNITS = 325;
const LEAN_PEAK_UNITS = 140;
const ROLL_PEAK_UNITS = 125;
const ROTATION_PEAK_UNITS = 115;
const NORMALISER_SAMPLES = 200;

interface UpperRanges {
  trunkPitch: number;
  tilt: number;
  drop: number;
  pelvisRotation: number;
  trunkTwist: number;
}

export const UPPER_RANGES: Readonly<Record<PaceId, UpperRanges>> = {
  easy: { trunkPitch: 6.3, tilt: 5, drop: 9.5, pelvisRotation: 10, trunkTwist: 23 },
  steady: { trunkPitch: 7.1, tilt: 6, drop: 11.3, pelvisRotation: 12, trunkTwist: 25 },
  fast: { trunkPitch: 8.2, tilt: 7, drop: 11.8, pelvisRotation: 13, trunkTwist: 29 },
};

interface HipNormaliser {
  mean: number;
  halfRange: number;
}

function normaliserFor(pace: PaceId): HipNormaliser {
  const values = Array.from({ length: NORMALISER_SAMPLES }, (_, index) =>
    evaluateFit(GAIT_DATA[pace].angles.hipFlex, (index * CYCLE_UNITS) / NORMALISER_SAMPLES),
  );
  const low = Math.min(...values);
  const high = Math.max(...values);
  return { mean: (low + high) / 2, halfRange: (high - low) / 2 };
}

const NORMALISERS: Readonly<Record<PaceId, HipNormaliser>> = {
  easy: normaliserFor('easy'),
  steady: normaliserFor('steady'),
  fast: normaliserFor('fast'),
};

function swingOf(units: number, pace: PaceId): number {
  const { mean, halfRange } = NORMALISERS[pace];
  return (evaluateFit(GAIT_DATA[pace].angles.hipFlex, units) - mean) / halfRange;
}

function stepCosine(units: number, peak: number): number {
  return Math.cos((FULL_TURN * (units - peak)) / STEP_UNITS);
}

function cycleCosine(units: number, peak: number): number {
  return Math.cos((FULL_TURN * (units - peak)) / CYCLE_UNITS);
}

export function upperAt(units: number, pace: PaceId, arms: ArmsId): UpperReading {
  const ranges = UPPER_RANGES[pace];
  const inStep = units % STEP_UNITS;
  const held = arms === 'held';
  const roll = 0.5 * ranges.drop * stepCosine(inStep, ROLL_PEAK_UNITS);
  const pelvisRot =
    0.5 *
    ranges.pelvisRotation *
    (held ? HELD_PELVIS_GAIN : 1) *
    cycleCosine(units, ROTATION_PEAK_UNITS);
  const twist =
    -0.5 *
    ranges.trunkTwist *
    (held ? HELD_TWIST_GAIN : 1) *
    cycleCosine(units, ROTATION_PEAK_UNITS);
  const rightSwing = swingOf(units, pace);
  const leftSwing = swingOf((units + STEP_UNITS) % CYCLE_UNITS, pace);
  const lean = LEAN_MEAN_DEG + 0.5 * ranges.trunkPitch * stepCosine(inStep, LEAN_PEAK_UNITS);
  return {
    leanDeg: lean,
    pelvisTiltDeg: PELVIS_TILT_DEG + 0.5 * ranges.tilt * stepCosine(inStep, TILT_PEAK_UNITS),
    pelvisRollDeg: units < STEP_UNITS ? roll : -roll,
    pelvisRotDeg: pelvisRot,
    trunkTwistDeg: twist,
    shoulderRotDeg: pelvisRot + twist,
    shoulderFlexDeg: held
      ? { right: 0, left: 0 }
      : { right: ARM_SWING_AMP_DEG * leftSwing, left: ARM_SWING_AMP_DEG * rightSwing },
    elbowDeg: held
      ? { right: HELD_ELBOW_DEG, left: HELD_ELBOW_DEG }
      : {
          right: ELBOW_MEAN_DEG + ELBOW_SWING_DEG * leftSwing,
          left: ELBOW_MEAN_DEG + ELBOW_SWING_DEG * rightSwing,
        },
    headPitchDeg: -lean,
    holdsArms: held,
  };
}
