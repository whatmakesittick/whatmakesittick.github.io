import type { Quaternion } from 'three';
import { Vector3 } from 'three';
import { FULL_TURN, toRadians } from '@core/math';
import type { GaitReading } from '../../ids';
import { CYCLE_UNITS } from '../../model/timeMap';
import { RIG_BODY } from './body';
import { apply, fromEuler } from './frames';

export const SWAY_HALF_M = 0.008;
const SWAY_PEAK_UNITS = 170;

export interface PelvisState {
  readonly position: Vector3;
  readonly rotation: Quaternion;
}

export interface TrunkState {
  readonly rotation: Quaternion;
  readonly shoulders: Vector3;
}

export function swayAt(units: number): number {
  return SWAY_HALF_M * Math.cos((FULL_TURN * (units - SWAY_PEAK_UNITS)) / CYCLE_UNITS);
}

export function pelvisRotation(reading: GaitReading): Quaternion {
  const { pelvisRollDeg, pelvisRotDeg, pelvisTiltDeg } = reading.upper;
  return fromEuler(
    toRadians(-pelvisRollDeg),
    toRadians(pelvisRotDeg),
    toRadians(-pelvisTiltDeg),
    'YXZ',
  );
}

export function pelvisAt(reading: GaitReading, hipHeightM: number): PelvisState {
  const { com, units } = reading;
  return {
    position: new Vector3(com.surgeM, hipHeightM + com.heightM, swayAt(units)),
    rotation: pelvisRotation(reading),
  };
}

export function trunkAt(reading: GaitReading, pelvis: PelvisState): TrunkState {
  const rotation = fromEuler(
    0,
    toRadians(reading.upper.shoulderRotDeg),
    toRadians(-reading.upper.leanDeg),
    'YXZ',
  );
  return {
    rotation,
    shoulders: pelvis.position
      .clone()
      .add(apply(rotation, RIG_BODY.shoulderOverHips[0], RIG_BODY.shoulderOverHips[1], 0)),
  };
}
