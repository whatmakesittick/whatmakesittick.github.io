import { clamp, lerp } from '@core/math';
import type { Point, SensorModeId, SensorReading, StrikeReading } from '../ids';
import { flightAt, isOnStation } from './flight';
import { TARGET } from './layout';
import { MOMENTS } from './mission';

export const LAUNCH_UNITS = MOMENTS.launch;
export const IMPACT_UNITS = MOMENTS.impact;
export const FLASH_UNITS = 2;
export const MISSILE_ARC_RISE = 40;
const MISSILE_ARC_CONTROL_SHARE = 0.4;
const SENSOR_LOOK_AHEAD = 300;

export const LAUNCH_POINT: Point = flightAt(LAUNCH_UNITS).position;

export function missilePointAt(share: number): Point {
  const t = clamp(share, 0, 1);
  const control: Point = [
    lerp(LAUNCH_POINT[0], TARGET[0], MISSILE_ARC_CONTROL_SHARE),
    lerp(LAUNCH_POINT[1], TARGET[1], MISSILE_ARC_CONTROL_SHARE) + MISSILE_ARC_RISE,
    lerp(LAUNCH_POINT[2], TARGET[2], MISSILE_ARC_CONTROL_SHARE),
  ];
  const a = (1 - t) * (1 - t);
  const b = 2 * (1 - t) * t;
  const c = t * t;
  return [
    a * LAUNCH_POINT[0] + b * control[0] + c * TARGET[0],
    a * LAUNCH_POINT[1] + b * control[1] + c * TARGET[1],
    a * LAUNCH_POINT[2] + b * control[2] + c * TARGET[2],
  ];
}

export function strikeAt(units: number): StrikeReading {
  if (units < LAUNCH_UNITS) return { stage: 'armed', share: 0, launchPoint: null, flash: 0 };
  if (units < IMPACT_UNITS) {
    const share = (units - LAUNCH_UNITS) / (IMPACT_UNITS - LAUNCH_UNITS);
    return { stage: 'flying', share, launchPoint: LAUNCH_POINT, flash: 0 };
  }
  if (units < IMPACT_UNITS + FLASH_UNITS) {
    const flash = 1 - (units - IMPACT_UNITS) / FLASH_UNITS;
    return { stage: 'hit', share: 1, launchPoint: LAUNCH_POINT, flash };
  }
  return { stage: 'done', share: 1, launchPoint: LAUNCH_POINT, flash: 0 };
}

export function sensorAimAt(units: number): Point {
  if (isOnStation(units)) return TARGET;
  const { position, heading } = flightAt(units);
  return [
    position[0] + SENSOR_LOOK_AHEAD * Math.cos(heading),
    0,
    position[2] + SENSOR_LOOK_AHEAD * Math.sin(heading),
  ];
}

export function sensorAt(units: number, mode: SensorModeId): SensorReading {
  const { stage } = strikeAt(units);
  return {
    mode,
    aim: sensorAimAt(units),
    onTarget: isOnStation(units),
    lasing: stage === 'flying',
  };
}
