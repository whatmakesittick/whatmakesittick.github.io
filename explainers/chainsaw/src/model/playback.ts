import { slowMotionFactor } from '@core/playback';
import { MAX_POWER_RPM } from './constants';
import { CYCLE_DEG } from './cycle';
import { SECONDS_PER_MINUTE } from './drive';

export const REAL_TIME_SPEED = 12;
export const DEFAULT_SPEED = 3;
export const SLOW_SPEED = 2;
export const SPEED_RANGE = { min: 1, max: 6, step: 1, default: DEFAULT_SPEED } as const;

export function slowMotion(speed: number): number {
  return slowMotionFactor(speed, REAL_TIME_SPEED);
}

export function rate(speed: number): number {
  return (CYCLE_DEG * (MAX_POWER_RPM / SECONDS_PER_MINUTE)) / slowMotion(speed);
}

export function rpmScale(rpm: number): number {
  return rpm / MAX_POWER_RPM;
}

export function screenTurnSeconds(speed: number, rpm: number): number {
  return CYCLE_DEG / (rate(speed) * rpmScale(rpm));
}
