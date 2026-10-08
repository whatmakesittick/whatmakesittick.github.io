import { lerp, smoothstep } from '@core/math';
import type { OperatingStateId, SiteWindId } from '../ids';
import {
  CUT_IN_MS,
  CUT_OUT_MS,
  FEATHER_DEG,
  GEAR_RATIO,
  MAX_RPM,
  MODEL_TIP_SPEED_RATIO,
  RAMP_START_MS,
  RATED_WIND_MS,
  RESTART_MS,
  ROTOR_DIAMETER_M,
  START_MINUTES,
  STOP_MINUTES,
} from './constants';
import { PITCH_KNOTS, interpolateKnots } from './curves';
import { CYCLE_MINUTES, dayWind, wrapMinute } from './day';

export interface OperatingReading {
  state: OperatingStateId;
  rpm: number;
  pitchDeg: number;
  braked: boolean;
  producing: boolean;
}

export interface ParkedWindow {
  stop: number;
  restart: number;
}

const SECONDS_PER_MINUTE = 60;
const FULL_TURN_RAD = 2 * Math.PI;
const FEATHER_SHARE = 0.6;
const SPIN_DOWN_SHARE = 0.8;
const SPIN_UP_START_SHARE = 0.2;
const PRODUCING_STATES: readonly OperatingStateId[] = ['partial', 'full', 'rampDown'];

export function runningRpm(wind: number): number {
  const followRpm =
    (MODEL_TIP_SPEED_RATIO * Math.max(0, wind) * SECONDS_PER_MINUTE) / (Math.PI * ROTOR_DIAMETER_M);
  return Math.min(MAX_RPM, followRpm);
}

export function tipSpeed(rpm: number): number {
  return (Math.PI * ROTOR_DIAMETER_M * rpm) / SECONDS_PER_MINUTE;
}

export function generatorRpm(rpm: number): number {
  return rpm * GEAR_RATIO;
}

export function runningPitchDeg(wind: number): number {
  return interpolateKnots(PITCH_KNOTS, wind);
}

export function runningState(wind: number): OperatingStateId {
  if (wind < CUT_IN_MS) return 'idle';
  if (wind < RATED_WIND_MS) return 'partial';
  if (wind <= RAMP_START_MS) return 'full';
  if (wind < CUT_OUT_MS) return 'rampDown';
  return 'parked';
}

function reading(
  state: OperatingStateId,
  rpm: number,
  pitchDeg: number,
  braked: boolean,
): OperatingReading {
  return { state, rpm, pitchDeg, braked, producing: PRODUCING_STATES.includes(state) };
}

function runningAt(wind: number): OperatingReading {
  const state = runningState(wind);
  if (state === 'parked') return parkedReading();
  return reading(state, runningRpm(wind), runningPitchDeg(wind), false);
}

function parkedReading(): OperatingReading {
  return reading('parked', 0, FEATHER_DEG, true);
}

export function operatingAtWind(wind: number): OperatingReading {
  return runningAt(wind);
}

function findParkedWindow(site: SiteWindId): ParkedWindow | null {
  let stop: number | null = null;
  for (let minute = 0; minute < CYCLE_MINUTES; minute += 1) {
    const wind = dayWind(minute, site);
    if (stop === null && wind >= CUT_OUT_MS) stop = minute;
    else if (stop !== null && wind < RESTART_MS) return { stop, restart: minute };
  }
  return stop === null ? null : { stop, restart: CYCLE_MINUTES };
}

const parkedWindows = new Map<SiteWindId, ParkedWindow | null>();

export function parkedWindow(site: SiteWindId): ParkedWindow | null {
  if (!parkedWindows.has(site)) parkedWindows.set(site, findParkedWindow(site));
  return parkedWindows.get(site) ?? null;
}

function stoppingAt(progress: number, windAtStop: number): OperatingReading {
  const pitchDeg = lerp(
    runningPitchDeg(windAtStop),
    FEATHER_DEG,
    smoothstep(progress, 0, FEATHER_SHARE),
  );
  const rpm = runningRpm(windAtStop) * (1 - smoothstep(progress, 0, SPIN_DOWN_SHARE));
  return reading('stopping', rpm, pitchDeg, progress >= SPIN_DOWN_SHARE);
}

function startingAt(progress: number, wind: number): OperatingReading {
  const pitchDeg = lerp(FEATHER_DEG, runningPitchDeg(wind), smoothstep(progress, 0, FEATHER_SHARE));
  const rpm = runningRpm(wind) * smoothstep(progress, SPIN_UP_START_SHARE, 1);
  return reading('starting', rpm, pitchDeg, false);
}

export function operatingAt(minute: number, site: SiteWindId): OperatingReading {
  const clock = wrapMinute(minute);
  const wind = dayWind(clock, site);
  const window = parkedWindow(site);
  if (window === null || clock < window.stop) return runningAt(wind);
  const parkedFrom = window.stop + STOP_MINUTES;
  if (clock < parkedFrom) {
    return stoppingAt((clock - window.stop) / STOP_MINUTES, dayWind(window.stop, site));
  }
  if (clock < window.restart) return parkedReading();
  if (clock < window.restart + START_MINUTES) {
    return startingAt((clock - window.restart) / START_MINUTES, wind);
  }
  return runningAt(wind);
}

export function advanceAzimuth(azimuth: number, rpm: number, deltaSeconds: number): number {
  const next = azimuth + (rpm / SECONDS_PER_MINUTE) * FULL_TURN_RAD * deltaSeconds;
  return ((next % FULL_TURN_RAD) + FULL_TURN_RAD) % FULL_TURN_RAD;
}
