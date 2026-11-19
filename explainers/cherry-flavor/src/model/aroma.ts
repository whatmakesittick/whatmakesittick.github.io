import { clamp, smoothstep } from '@core/math';
import { ODORANT_IDS } from '../ids';
import type { OdorantId, OdorantLevels } from '../ids';
import {
  IN_MOUTH_S,
  MOUTH_C,
  SERVING_RANGE_C,
  SWALLOW_S,
  biteTemperature,
  meltShare,
} from './bite';
import { FOOD_PROFILES, emptyLevels } from './odorants';
import { END_S, START_S } from './timeMap';

export const VOLATILITY_SCALE_C = 25;
export const FAT_RANGE_PERCENT = { min: 2, max: 20, step: 1, default: 10 } as const;
export const FAT_HOLD_PER_PERCENT = 0.1;
export const FAT_AFFINITY: Readonly<Record<OdorantId, number>> = {
  benzaldehyde: 0.5,
  hexenal: 0.5,
  linalool: 0.7,
  eugenol: 0.7,
  ionone: 0.9,
};
export const FROZEN_SURFACE_SHARE = 0.15;
export const AFTER_TAU_S = 2.5;
export const SNIFF_GAIN = 3;
export const SNIFF_WINDOW_S = { rise: [-2, -1], fall: [-0.6, 0] } as const;
export const RISE_DELAY_S = 1;
export const SWALLOW_PUFF = { gain: 0.6, rise: [12, 12.5], fall: [12.5, 14.5] } as const;
export const PEAK_SAMPLE_S = 0.1;

export interface AromaSettings {
  profile: Readonly<OdorantLevels>;
  servingC: number;
  fatPercent: number;
}

export function volatility(celsius: number): number {
  return Math.exp((celsius - MOUTH_C) / VOLATILITY_SCALE_C);
}

export function freeShare(id: OdorantId, fatPercent: number): number {
  return 1 / (1 + FAT_HOLD_PER_PERCENT * FAT_AFFINITY[id] * fatPercent);
}

function window(
  seconds: number,
  [riseStart, riseEnd]: readonly number[],
  [fallStart, fallEnd]: readonly number[],
): number {
  return smoothstep(seconds, riseStart, riseEnd) * (1 - smoothstep(seconds, fallStart, fallEnd));
}

function chewingLevel(id: OdorantId, seconds: number, settings: AromaSettings): number {
  const exposed =
    FROZEN_SURFACE_SHARE + (1 - FROZEN_SURFACE_SHARE) * meltShare(seconds, settings.servingC);
  const warm = volatility(biteTemperature(seconds, settings.servingC));
  return settings.profile[id] * freeShare(id, settings.fatPercent) * warm * exposed;
}

function mouthLevel(id: OdorantId, seconds: number, settings: AromaSettings): number {
  if (seconds < IN_MOUTH_S) return 0;
  if (seconds < SWALLOW_S) return chewingLevel(id, seconds, settings);
  return chewingLevel(id, SWALLOW_S, settings) * Math.exp(-(seconds - SWALLOW_S) / AFTER_TAU_S);
}

export function mouthAroma(
  seconds: number,
  settings: AromaSettings,
  out = emptyLevels(),
): OdorantLevels {
  ODORANT_IDS.forEach((id) => {
    out[id] = mouthLevel(id, seconds, settings);
  });
  return out;
}

export function orthoAroma(
  seconds: number,
  settings: AromaSettings,
  out = emptyLevels(),
): OdorantLevels {
  const sniff =
    seconds < IN_MOUTH_S ? window(seconds, SNIFF_WINDOW_S.rise, SNIFF_WINDOW_S.fall) : 0;
  const surface = volatility(settings.servingC) * FROZEN_SURFACE_SHARE * SNIFF_GAIN * sniff;
  ODORANT_IDS.forEach((id) => {
    out[id] = settings.profile[id] * freeShare(id, settings.fatPercent) * surface;
  });
  return out;
}

export function retroAroma(
  seconds: number,
  settings: AromaSettings,
  out = emptyLevels(),
): OdorantLevels {
  const puff = SWALLOW_PUFF.gain * window(seconds, SWALLOW_PUFF.rise, SWALLOW_PUFF.fall);
  ODORANT_IDS.forEach((id) => {
    out[id] =
      mouthLevel(id, seconds - RISE_DELAY_S, settings) + puff * mouthLevel(id, SWALLOW_S, settings);
  });
  return out;
}

const orthoScratch = emptyLevels();
const retroScratch = emptyLevels();

export function noseAroma(
  seconds: number,
  settings: AromaSettings,
  pinched: boolean,
  out = emptyLevels(),
): OdorantLevels {
  const ortho = orthoAroma(seconds, settings, orthoScratch);
  const retro = retroAroma(seconds, settings, retroScratch);
  ODORANT_IDS.forEach((id) => {
    out[id] = pinched ? 0 : ortho[id] + retro[id];
  });
  return out;
}

export const AROMA_FULL = ODORANT_IDS.reduce(
  (sum, id) => sum + FOOD_PROFILES.cherry[id] * freeShare(id, FAT_RANGE_PERCENT.min),
  0,
);

export const MOST_RELEASING: Readonly<AromaSettings> = {
  profile: FOOD_PROFILES.cherry,
  servingC: SERVING_RANGE_C.max,
  fatPercent: FAT_RANGE_PERCENT.min,
};

const SAMPLE_COUNT = Math.round((END_S - START_S) / PEAK_SAMPLE_S);
const SAMPLE_SECONDS = Array.from(
  { length: SAMPLE_COUNT + 1 },
  (_, index) => START_S + index * PEAK_SAMPLE_S,
);

function totalOf(levels: Readonly<OdorantLevels>): number {
  return ODORANT_IDS.reduce((sum, id) => sum + levels[id], 0);
}

function highestTotal(levelsAt: (seconds: number) => Readonly<OdorantLevels>): number {
  return SAMPLE_SECONDS.reduce((peak, seconds) => Math.max(peak, totalOf(levelsAt(seconds))), 0);
}

const fullScratch = emptyLevels();

export const MOUTH_FULL = highestTotal((seconds) =>
  mouthAroma(seconds, MOST_RELEASING, fullScratch),
);
export const NOSE_FULL = highestTotal((seconds) =>
  noseAroma(seconds, MOST_RELEASING, false, fullScratch),
);

function shareOf(levels: Readonly<OdorantLevels>, full: number): number {
  return clamp(totalOf(levels) / full, 0, 1);
}

export function releasedShare(levels: Readonly<OdorantLevels>): number {
  return shareOf(levels, MOUTH_FULL);
}

export function noseShare(levels: Readonly<OdorantLevels>): number {
  return shareOf(levels, NOSE_FULL);
}

const peakCache = new Map<string, number>();
const peakScratch = emptyLevels();

function settingsKey(settings: AromaSettings, pinched: boolean): string {
  const levels = ODORANT_IDS.map((id) => settings.profile[id]).join(',');
  return `${levels}|${settings.servingC}|${settings.fatPercent}|${pinched}`;
}

function samplePeak(settings: AromaSettings, pinched: boolean): number {
  return SAMPLE_SECONDS.reduce(
    (peak, seconds) =>
      Math.max(peak, noseShare(noseAroma(seconds, settings, pinched, peakScratch))),
    0,
  );
}

export function peakNoseShare(settings: AromaSettings, pinched = false): number {
  const key = settingsKey(settings, pinched);
  const cached = peakCache.get(key);
  if (cached !== undefined) return cached;
  const peak = samplePeak(settings, pinched);
  peakCache.set(key, peak);
  return peak;
}
