import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const PACE_SPEEDS = { easy: '2.5', steady: '3.5', fast: '4.5' } as const;
const ANGLE_KEYS = [
  'hipFlex',
  'hipAdd',
  'hipRot',
  'kneeFlex',
  'kneeAdd',
  'kneeRot',
  'ankleDorsi',
  'ankleInv',
  'ankleRot',
] as const;
const FORCE_KEYS = ['grfFwd', 'grfVert', 'grfRight'] as const;
const MEAN_REMOVED = new Set<string>(['ankleInv', 'ankleRot']);
const ANGLE_DECIMALS = 3;
const FORCE_DECIMALS = 3;
const SAMPLES = 100;
const UNITS_PER_PERCENT = 10;

interface Curve {
  mean: number[];
  fourier: { a0: number; cos: number[]; sin: number[]; maxFitErr: number };
}

interface Speed {
  n: number;
  curves: Record<string, Curve>;
  timing: { toeOffPercent: { mean: number }; cadenceStepsPerMin: number };
  discrete: Record<string, { mean: number } | number>;
}

interface Source {
  meta: { attribution: string };
  speeds: Record<string, Speed>;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function argMax(values: readonly number[], from: number, to: number): number {
  let best = from;
  for (let i = from; i < to; i += 1) if (values[i] > values[best]) best = i;
  return best;
}

function argMin(values: readonly number[]): number {
  return values.reduce((best, value, i) => (value < values[best] ? i : best), 0);
}

function discreteMean(speed: Speed, key: string, decimals: number): number {
  const entry = speed.discrete[key];
  if (typeof entry === 'number') return round(entry, decimals);
  return round(entry.mean, decimals);
}

function paceData(speed: Speed) {
  const toeOffUnits = Math.round(speed.timing.toeOffPercent.mean * UNITS_PER_PERCENT);
  const toeOffIndex = Math.round(speed.timing.toeOffPercent.mean);
  const fwd = speed.curves.grfFwd.mean.slice(0, SAMPLES);
  const knee = speed.curves.kneeFlex.mean.slice(0, SAMPLES);
  const brakingIndex = argMin(fwd);
  let midStanceIndex = brakingIndex;
  while (fwd[midStanceIndex] < 0) midStanceIndex += 1;
  const swingPeakIndex = argMax(knee, toeOffIndex, SAMPLES);
  const stancePeakIndex = argMax(knee, 0, toeOffIndex);
  const vert = speed.curves.grfVert.mean.slice(0, SAMPLES);
  const angles = Object.fromEntries(
    ANGLE_KEYS.map((key) => {
      const fit = speed.curves[key].fourier;
      return [
        key,
        {
          a0: MEAN_REMOVED.has(key) ? 0 : round(fit.a0, ANGLE_DECIMALS),
          cos: fit.cos.map((value) => round(value, ANGLE_DECIMALS)),
          sin: fit.sin.map((value) => round(value, ANGLE_DECIMALS)),
        },
      ];
    }),
  );
  const fitErrors = Object.fromEntries(
    ANGLE_KEYS.map((key) => [key, round(speed.curves[key].fourier.maxFitErr, 2)]),
  );
  const forces = Object.fromEntries(
    FORCE_KEYS.map((key) => [
      key,
      speed.curves[key].mean.slice(0, SAMPLES).map((value) => round(value, FORCE_DECIMALS)),
    ]),
  );
  return {
    n: speed.n,
    cadence: speed.timing.cadenceStepsPerMin,
    toeOffUnits,
    midStanceUnits: midStanceIndex * UNITS_PER_PERCENT,
    midSwingUnits: swingPeakIndex * UNITS_PER_PERCENT,
    stanceKneePeakUnits: stancePeakIndex * UNITS_PER_PERCENT,
    forcePeakUnits: argMax(vert, 0, SAMPLES) * UNITS_PER_PERCENT,
    brakingPeakUnits: brakingIndex * UNITS_PER_PERCENT,
    peakBrakingBW: round(-fwd[brakingIndex], 2),
    peakVerticalBW: discreteMean(speed, 'peakVerticalGrfBW', 2),
    kneeLandDeg: discreteMean(speed, 'kneeLand', 1),
    kneeStancePeakDeg: discreteMean(speed, 'kneeStancePk', 1),
    kneeSwingPeakDeg: discreteMean(speed, 'kneeSwingPk', 1),
    hipExtensionPeakDeg: discreteMean(speed, 'hipExtPk', 1),
    hipFlexionPeakDeg: discreteMean(speed, 'hipFlexPk', 1),
    ankleLandDeg: discreteMean(speed, 'ankleLand', 1),
    angles,
    fitErrors,
    forces: { fwd: forces.grfFwd, vert: forces.grfVert, right: forces.grfRight },
  };
}

function main(): void {
  const [source, target] = process.argv.slice(2);
  if (!source || !target) throw new Error('usage: gait-data.ts <kinematics.json> <gaitData.ts>');
  const raw = readFileSync(source);
  const data = JSON.parse(raw.toString('utf8')) as Source;
  const paces = Object.fromEntries(
    Object.entries(PACE_SPEEDS).map(([pace, speed]) => [pace, paceData(data.speeds[speed])]),
  );
  const hash = createHash('sha256').update(raw).digest('hex');
  const body = `import type { PaceId } from '../ids';

export const ANGLE_KEYS = ${JSON.stringify(ANGLE_KEYS)} as const;

export type AngleKey = (typeof ANGLE_KEYS)[number];

export interface FourierFit {
  a0: number;
  cos: readonly number[];
  sin: readonly number[];
}

export interface PaceData {
  n: number;
  cadence: number;
  toeOffUnits: number;
  midStanceUnits: number;
  midSwingUnits: number;
  stanceKneePeakUnits: number;
  forcePeakUnits: number;
  brakingPeakUnits: number;
  peakBrakingBW: number;
  peakVerticalBW: number;
  kneeLandDeg: number;
  kneeStancePeakDeg: number;
  kneeSwingPeakDeg: number;
  hipExtensionPeakDeg: number;
  hipFlexionPeakDeg: number;
  ankleLandDeg: number;
  angles: Readonly<Record<AngleKey, FourierFit>>;
  fitErrors: Readonly<Record<AngleKey, number>>;
  forces: { fwd: readonly number[]; vert: readonly number[]; right: readonly number[] };
}

export const ATTRIBUTION = ${JSON.stringify(data.meta.attribution)};

export const SOURCE_SHA256 = '${hash}';

export const GAIT_DATA: Readonly<Record<PaceId, PaceData>> = ${JSON.stringify(paces)};
`;
  writeFileSync(target, body);
}

main();
