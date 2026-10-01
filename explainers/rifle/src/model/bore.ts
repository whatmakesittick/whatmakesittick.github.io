import { clamp, lerp } from '@core/math';
import {
  MUZZLE_PRESSURE_MPA,
  MUZZLE_SPEED,
  PEAK_PRESSURE_MPA,
  PEAK_TRAVEL_MM,
  START_PRESSURE_MPA,
} from './constants';
import { BULLET_TRAVEL } from './layout';

const SAMPLE_COUNT = 128;
const FALL_EXPONENT = 1.6;
const QUARTER_TURN = Math.PI / 2;
const SAMPLE_STEP = BULLET_TRAVEL / SAMPLE_COUNT;

function risingPressure(travel: number): number {
  const share = clamp(travel / PEAK_TRAVEL_MM, 0, 1);
  return lerp(START_PRESSURE_MPA, PEAK_PRESSURE_MPA, Math.sin(QUARTER_TURN * share));
}

function fallingPressure(travel: number): number {
  const remaining = clamp((BULLET_TRAVEL - travel) / (BULLET_TRAVEL - PEAK_TRAVEL_MM), 0, 1);
  return lerp(MUZZLE_PRESSURE_MPA, PEAK_PRESSURE_MPA, remaining ** FALL_EXPONENT);
}

export function pressureAtTravel(travel: number): number {
  return travel <= PEAK_TRAVEL_MM ? risingPressure(travel) : fallingPressure(travel);
}

interface BoreTable {
  work: readonly number[];
  time: readonly number[];
}

function midpointPressure(index: number): number {
  return pressureAtTravel((index + 0.5) * SAMPLE_STEP);
}

function buildTable(): BoreTable {
  const work = [0];
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    work.push(work[index] + midpointPressure(index) * SAMPLE_STEP);
  }
  const fullWork = work[SAMPLE_COUNT];
  const time = [0];
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const middleWork = work[index] + (midpointPressure(index) * SAMPLE_STEP) / 2;
    time.push(time[index] + SAMPLE_STEP / (MUZZLE_SPEED * Math.sqrt(middleWork / fullWork)));
  }
  return { work, time };
}

const TABLE = buildTable();
const FULL_WORK = TABLE.work[SAMPLE_COUNT];

export const BARREL_TIME_MS = TABLE.time[SAMPLE_COUNT];

function sampleAt(values: readonly number[], travel: number): number {
  const position = clamp(travel, 0, BULLET_TRAVEL) / SAMPLE_STEP;
  const index = Math.min(SAMPLE_COUNT - 1, Math.floor(position));
  return lerp(values[index], values[index + 1], position - index);
}

export function speedAtTravel(travel: number): number {
  return MUZZLE_SPEED * Math.sqrt(sampleAt(TABLE.work, travel) / FULL_WORK);
}

export function travelTimeMs(travel: number): number {
  return sampleAt(TABLE.time, travel);
}

export function travelAtTime(elapsedMs: number): number {
  const { time } = TABLE;
  if (elapsedMs <= 0) return 0;
  if (elapsedMs >= BARREL_TIME_MS) return BULLET_TRAVEL;
  const next = time.findIndex((sample) => sample > elapsedMs);
  const share = (elapsedMs - time[next - 1]) / (time[next] - time[next - 1]);
  return (next - 1 + share) * SAMPLE_STEP;
}
