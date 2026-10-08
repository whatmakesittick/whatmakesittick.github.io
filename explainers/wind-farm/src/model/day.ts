import { PHASE_IDS, SITE_WIND_IDS } from '../ids';
import type { PhaseId, SiteWindId, WindPresetId } from '../ids';
import { CUT_IN_MS, RATED_WIND_MS, VEER_DEG, WIND_FROM_DEG } from './constants';
import { interpolateKnots } from './curves';
import type { Knot } from './curves';

export const MINUTES_PER_HOUR = 60;
export const CYCLE_MINUTES = 24 * MINUTES_PER_HOUR;

export const PHASE_RANGES: Readonly<Record<PhaseId, readonly [start: number, end: number]>> = {
  night: [0, 360],
  morning: [360, 690],
  afternoon: [690, 960],
  storm: [960, 1148],
  evening: [1148, CYCLE_MINUTES],
};

export const BASE_WIND_KNOTS: readonly Knot[] = [
  [0, 2.5],
  [300, 2.5],
  [360, 3],
  [600, 9],
  [690, 12],
  [900, 16],
  [960, 18],
  [1000, 26],
  [1100, 26],
  [1148, 18],
  [1200, 13],
  [1320, 7],
  [CYCLE_MINUTES, 2.5],
];

export const STORM_CORE = [1000, 1100] as const;

export const SITE_WIND_SCALE: Readonly<Record<SiteWindId, number>> = {
  calm: 0.8,
  typical: 1,
  windy: 1.15,
};

const PEAK_EFFICIENCY_MS = 8;
const PARKED_DEMO_MS = 25;
const RAMP_DEMO_MS = 23;

export const WIND_PRESETS: Readonly<Record<WindPresetId, number>> = {
  cutIn: CUT_IN_MS,
  peak: PEAK_EFFICIENCY_MS,
  rated: RATED_WIND_MS,
  rampDown: RAMP_DEMO_MS,
  cutOut: PARKED_DEMO_MS,
};

export const DEFAULT_SPEED = 12;
export const SPEED_RANGE = { min: 1, max: 60, step: 1, default: DEFAULT_SPEED } as const;

const SECONDS_PER_MINUTE = 60;

export function rate(speed: number): number {
  return (speed * MINUTES_PER_HOUR) / SECONDS_PER_MINUTE;
}

export function wrapMinute(minute: number): number {
  return ((minute % CYCLE_MINUTES) + CYCLE_MINUTES) % CYCLE_MINUTES;
}

export function phaseOf(minute: number): PhaseId {
  const wrapped = wrapMinute(minute);
  return PHASE_IDS.find((id) => wrapped < PHASE_RANGES[id][1]) ?? PHASE_IDS[PHASE_IDS.length - 1];
}

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

export function clockOf(minute: number): string {
  const whole = Math.floor(wrapMinute(minute));
  return `${twoDigits(Math.floor(whole / MINUTES_PER_HOUR))}:${twoDigits(whole % MINUTES_PER_HOUR)}`;
}

function inStormCore(minute: number): boolean {
  return minute >= STORM_CORE[0] && minute <= STORM_CORE[1];
}

function siteKnots(scale: number): readonly Knot[] {
  return BASE_WIND_KNOTS.map(([minute, wind]) => [
    minute,
    inStormCore(minute) ? wind : wind * scale,
  ]);
}

const SITE_KNOTS: Readonly<Record<SiteWindId, readonly Knot[]>> = Object.fromEntries(
  SITE_WIND_IDS.map((site) => [site, siteKnots(SITE_WIND_SCALE[site])]),
) as Record<SiteWindId, readonly Knot[]>;

export function dayWind(minute: number, site: SiteWindId): number {
  return interpolateKnots(SITE_KNOTS[site], wrapMinute(minute));
}

const FULL_TURN_RAD = 2 * Math.PI;

export function windFromDeg(minute: number): number {
  return WIND_FROM_DEG + VEER_DEG * Math.sin((FULL_TURN_RAD * wrapMinute(minute)) / CYCLE_MINUTES);
}
