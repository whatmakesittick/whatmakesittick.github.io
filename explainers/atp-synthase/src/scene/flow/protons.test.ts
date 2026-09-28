import { describe, expect, it } from 'vitest';
import {
  CHANNEL_TRAVEL_DEG,
  HUMAN_BLADE_COUNT,
  PICKUP_AZIMUTH_DEG,
  RELEASE_AZIMUTH_DEG,
  bladeAzimuth,
} from '../../model/rotor';
import { PUMP_LANES } from '../constants';
import { ringLayout } from '../geometry/ringLayout';
import { beadPose } from './points';
import type { Point3 } from './points';
import { channelSpots, poseEntering, poseLeaving, posePumped, poseRider } from './protons';

const LAYOUT = ringLayout(HUMAN_BLADE_COUNT);
const SPOTS = channelSpots(LAYOUT);

function rotorPutting(blade: number, azimuthDeg: number): number {
  return azimuthDeg - bladeAzimuth(blade, 0, HUMAN_BLADE_COUNT);
}

function distance(a: Point3, b: Point3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

describe('proton paths', () => {
  it('rides every blade except the one facing the gate', () => {
    const rotor = 10;
    const riding = Array.from({ length: HUMAN_BLADE_COUNT }, (_, blade) =>
      poseRider(blade, rotor, LAYOUT, beadPose()),
    ).filter((pose) => pose.scale > 0);
    expect(riding.length).toBe(HUMAN_BLADE_COUNT - 1);
  });

  it('rises up the inlet from below and lands on the blade at the pickup point', () => {
    const early = poseEntering(
      0,
      rotorPutting(0, PICKUP_AZIMUTH_DEG - 19),
      LAYOUT,
      SPOTS,
      beadPose(),
    );
    expect(early.position.y).toBeLessThan(-2);
    const late = poseEntering(
      0,
      rotorPutting(0, PICKUP_AZIMUTH_DEG - 0.01),
      LAYOUT,
      SPOTS,
      beadPose(),
    );
    const rider = poseRider(0, rotorPutting(0, PICKUP_AZIMUTH_DEG), LAYOUT, beadPose());
    expect(distance(late.position, rider.position)).toBeLessThan(0.05);
  });

  it('steps off at the release point, climbs the outlet and drifts into the matrix', () => {
    const start = poseLeaving(0, rotorPutting(0, RELEASE_AZIMUTH_DEG), LAYOUT, SPOTS, beadPose());
    const rider = poseRider(0, rotorPutting(0, RELEASE_AZIMUTH_DEG - 0.01), LAYOUT, beadPose());
    expect(distance(start.position, rider.position)).toBeLessThan(0.05);
    const top = poseLeaving(
      0,
      rotorPutting(0, RELEASE_AZIMUTH_DEG + CHANNEL_TRAVEL_DEG - 0.01),
      LAYOUT,
      SPOTS,
      beadPose(),
    );
    expect(distance(top.position, SPOTS.outletMouth)).toBeLessThan(0.05);
    const drifting = poseLeaving(
      0,
      rotorPutting(0, RELEASE_AZIMUTH_DEG + CHANNEL_TRAVEL_DEG + 30),
      LAYOUT,
      SPOTS,
      beadPose(),
    );
    expect(drifting.position.y).toBeGreaterThan(SPOTS.outletMouth.y);
    expect(poseLeaving(0, rotorPutting(0, 200), LAYOUT, SPOTS, beadPose()).scale).toBe(0);
  });

  it('pushes pumped protons down through the membrane and fades them below', () => {
    const lane = PUMP_LANES.complexThree;
    const start = posePumped(lane, 0.05, beadPose());
    const end = posePumped(lane, 0.99, beadPose());
    expect(start.position.y).toBeGreaterThan(0);
    expect(end.position.y).toBeLessThan(-3);
    expect(end.scale).toBeLessThan(0.1);
  });
});
