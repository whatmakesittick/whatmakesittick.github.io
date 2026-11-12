import { clamp, lerp, smoothstep } from '@core/math';
import { REFLECTIVITY } from '../../../model/constants';
import { BEAM_WAYPOINTS } from '../../../model/layout';
import { COLLECT_PATH, EXPOSE_PATH, MASK_PATH, pathLength } from '../../../model/path';
import type { AssemblyState } from '../../../ids';
import {
  AFTERGLOW_END_UNITS,
  AFTERGLOW_LEVEL,
  CONE,
  EXPOSE_START_UNITS,
  FLARE_END_UNITS,
  LASER_FADE_START_UNITS,
  LASER_PULSE_WIDTH_UNITS,
  LASER_REST_LEVEL,
  MAIN_PULSE_UNITS,
  PLASMA_PEAK_UNITS,
  PRE_PULSE_UNITS,
  SCAN_UNITS,
} from './dims';

const COLLECT_LENGTH = pathLength(COLLECT_PATH);
const MASK_LENGTH = pathLength(MASK_PATH);
const EXPOSE_LENGTH = pathLength(EXPOSE_PATH);
const BOUNCE_FLAGS = BEAM_WAYPOINTS.slice(1).map((entry) => entry.bounce);

function pulse(units: number, centre: number): number {
  return Math.exp(-(((units - centre) / LASER_PULSE_WIDTH_UNITS) ** 2));
}

export function laserLevel(units: number): number {
  if (units >= FLARE_END_UNITS) return 0;
  const fade = 1 - smoothstep(units, LASER_FADE_START_UNITS, FLARE_END_UNITS);
  const bursts = pulse(units, PRE_PULSE_UNITS) + pulse(units, MAIN_PULSE_UNITS);
  return clamp((LASER_REST_LEVEL + (1 - LASER_REST_LEVEL) * bursts) * fade, 0, 1);
}

export function plasmaLevel(units: number): number {
  if (units < MAIN_PULSE_UNITS) return 0;
  if (units < PLASMA_PEAK_UNITS) return smoothstep(units, MAIN_PULSE_UNITS, PLASMA_PEAK_UNITS);
  if (units < FLARE_END_UNITS) {
    const share = (units - PLASMA_PEAK_UNITS) / (FLARE_END_UNITS - PLASMA_PEAK_UNITS);
    return lerp(1, AFTERGLOW_LEVEL, share);
  }
  const share = (units - FLARE_END_UNITS) / (AFTERGLOW_END_UNITS - FLARE_END_UNITS);
  return lerp(AFTERGLOW_LEVEL, 0, clamp(share, 0, 1));
}

export function coneLevel(units: number): number {
  const rise = smoothstep(units, FLARE_END_UNITS, FLARE_END_UNITS + CONE.riseUnits);
  const fall = smoothstep(units, AFTERGLOW_END_UNITS - CONE.fallUnits, AFTERGLOW_END_UNITS);
  return rise * (1 - fall);
}

export function chainMetres(state: AssemblyState): number {
  const { units, share, phase } = state.flash;
  if (phase === 'collect') return share * COLLECT_LENGTH;
  if (phase === 'mask') return COLLECT_LENGTH + share * MASK_LENGTH;
  if (phase !== 'expose') return 0;
  const travel = clamp((units - EXPOSE_START_UNITS) / (SCAN_UNITS - EXPOSE_START_UNITS), 0, 1);
  return COLLECT_LENGTH + MASK_LENGTH + travel * EXPOSE_LENGTH;
}

export function mirrorsBeforeLeg(leg: number): number {
  return BOUNCE_FLAGS.slice(0, leg + 1).filter(Boolean).length;
}

export function legGain(leg: number): number {
  return REFLECTIVITY ** mirrorsBeforeLeg(leg);
}
