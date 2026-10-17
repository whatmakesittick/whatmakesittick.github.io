import { describe, expect, it } from 'vitest';
import { Euler, Quaternion, Vector3 } from 'three';
import { NOZZLE_IDS } from '../../../ids';
import type { NozzleId, NozzleThrusts, TankReading } from '../../../ids';
import { CAR_MASS_KG, G } from '../../../model/constants';
import { METRES_PER_KN } from './constants';
import { forceLength, netThrustInCar, WEIGHT_LENGTH } from './forceArrows';

const TANK: TankReading = {
  pressureBar: 700,
  massKg: 100,
  massShare: 1,
  empty: false,
  emptyAtSeconds: null,
  shortfallMs: 0,
};

function thrusts(firing: readonly NozzleId[], each: number): NozzleThrusts {
  return Object.fromEntries(NOZZLE_IDS.map((id) => [id, firing.includes(id) ? each : 0])) as Record<
    NozzleId,
    number
  >;
}

const REAR: readonly NozzleId[] = [
  'rearOuterLeft',
  'rearInnerLeft',
  'rearInnerRight',
  'rearOuterRight',
];
const CORNERS: readonly NozzleId[] = [
  'cornerFrontLeft',
  'cornerFrontRight',
  'cornerRearLeft',
  'cornerRearRight',
];

describe('net thrust', () => {
  it('pushes the car forward when the rear nozzles fire', () => {
    const net = netThrustInCar({ nozzles: thrusts(REAR, 2000), tank: TANK }, new Vector3());
    expect(net.x).toBeCloseTo(8000);
    expect(net.y).toBeCloseTo(0);
    expect(net.z).toBeCloseTo(0);
  });

  it('lifts the car when the corner nozzles fire', () => {
    const net = netThrustInCar({ nozzles: thrusts(CORNERS, 5000), tank: TANK }, new Vector3());
    expect(net.toArray()).toEqual([0, 20000, 0]);
  });

  it('pushes an upside down car toward the ground', () => {
    const net = netThrustInCar({ nozzles: thrusts(CORNERS, 5000), tank: TANK }, new Vector3());
    net.applyQuaternion(new Quaternion().setFromEuler(new Euler(Math.PI, 0, 0)));
    expect(net.y).toBeCloseTo(-20000);
  });

  it('cancels the side nozzles against each other', () => {
    const net = netThrustInCar(
      { nozzles: thrusts(['frontLeft', 'frontRight'], 3000), tank: TANK },
      new Vector3(),
    );
    expect(net.length()).toBeCloseTo(0);
  });

  it('drops to nothing once the tank is empty', () => {
    const empty = { ...TANK, empty: true };
    const net = netThrustInCar({ nozzles: thrusts(REAR, 2000), tank: empty }, new Vector3());
    expect(net.length()).toBe(0);
  });
});

describe('force scale', () => {
  it('draws every force on the same metres per kilonewton', () => {
    expect(forceLength(1000)).toBeCloseTo(METRES_PER_KN);
    expect(WEIGHT_LENGTH).toBeCloseTo((CAR_MASS_KG * G * METRES_PER_KN) / 1000);
  });
});
