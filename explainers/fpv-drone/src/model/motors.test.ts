import { describe, expect, it } from 'vitest';
import { MOTOR_PART_IDS, MOVE_IDS } from '../ids';
import { MASS_G } from './figures';
import { flightAt } from './flight';
import {
  DEMO_HOVER_SHARE,
  DEMO_MIX_DELTA,
  MOTOR_MAX_THRUST_G,
  MOTOR_MIXES,
  PITCH_SIGNS,
  ROLL_SIGNS,
  YAW_SIGNS,
  motorsAt,
  speedingMotors,
  totalThrustG,
} from './motors';
import { allUpG } from './payload';
import { MOMENTS } from './sortie';

const PAYLOAD = MASS_G.defaultPayload;
const CRUISE_TIME = 20;
const ORBIT_TIME = 38;
const HOVER_TIME = 4.5;

function sum(shares: readonly number[]): number {
  return shares.reduce((total, share) => total + share, 0);
}

describe('motor mixing', () => {
  it('orders the motors as Betaflight does and signs the mixes by position and spin', () => {
    expect(MOTOR_PART_IDS).toEqual([
      'motorRearRight',
      'motorFrontRight',
      'motorRearLeft',
      'motorFrontLeft',
    ]);
    expect(PITCH_SIGNS).toEqual({
      motorRearRight: 1,
      motorFrontRight: -1,
      motorRearLeft: 1,
      motorFrontLeft: -1,
    });
    expect(ROLL_SIGNS).toEqual({
      motorRearRight: -1,
      motorFrontRight: -1,
      motorRearLeft: 1,
      motorFrontLeft: 1,
    });
    expect(YAW_SIGNS).toEqual({
      motorRearRight: -1,
      motorFrontRight: 1,
      motorRearLeft: 1,
      motorFrontLeft: -1,
    });
  });

  it('holds the hover with four equal shares and nothing before arming', () => {
    const hover = motorsAt(flightAt(HOVER_TIME), PAYLOAD);
    const expected = allUpG(PAYLOAD) / MOTOR_MAX_THRUST_G;
    hover.shares.forEach((share) => expect(share).toBeCloseTo(expected, 3));
    expect(expected).toBeCloseTo(0.175, 3);
    expect(totalThrustG(flightAt(80), allUpG(PAYLOAD))).toBe(0);
    expect(sum(motorsAt(flightAt(80), PAYLOAD).shares)).toBe(0);
  });

  it('spins up on the pad to the hover thrust at lift-off', () => {
    const idle = totalThrustG(flightAt(1), allUpG(PAYLOAD));
    expect(idle).toBeGreaterThan(0);
    expect(idle).toBeLessThan(allUpG(PAYLOAD));
    expect(totalThrustG(flightAt(MOMENTS.liftoff), allUpG(PAYLOAD))).toBeCloseTo(
      allUpG(PAYLOAD),
      6,
    );
  });

  it('needs more thrust tilted in cruise than level in the hover', () => {
    expect(totalThrustG(flightAt(CRUISE_TIME), allUpG(PAYLOAD))).toBeGreaterThan(
      1.1 * totalThrustG(flightAt(HOVER_TIME), allUpG(PAYLOAD)),
    );
  });

  it('speeds up the rear motors while the nose tilts down and the left ones banking left', () => {
    const pitching = motorsAt(flightAt(7), PAYLOAD);
    expect(pitching.shares[0]).toBeGreaterThan(pitching.shares[1]);
    expect(pitching.shares[2]).toBeGreaterThan(pitching.shares[3]);
    const banking = motorsAt(flightAt(MOMENTS.onStation), PAYLOAD);
    expect(banking.shares[0]).toBeGreaterThan(banking.shares[2]);
    expect(banking.shares[1]).toBeGreaterThan(banking.shares[3]);
  });

  it('turns left in the orbit with the clockwise pair faster', () => {
    const turning = motorsAt(flightAt(ORBIT_TIME), PAYLOAD);
    expect(turning.shares[0]).toBeGreaterThan(turning.shares[1]);
    expect(turning.shares[3]).toBeGreaterThan(turning.shares[2]);
    expect(turning.shares[0]).toBeCloseTo(turning.shares[3], 6);
  });

  it('keeps every share between zero and one through the sortie and a heavy load', () => {
    for (let seconds = 0; seconds <= 80; seconds += 0.5) {
      motorsAt(flightAt(seconds), 1500).shares.forEach((share) => {
        expect(share).toBeGreaterThanOrEqual(0);
        expect(share).toBeLessThanOrEqual(1);
      });
    }
  });

  it('tabulates the chapter mixes around the hover share', () => {
    expect(DEMO_HOVER_SHARE).toBeCloseTo(0.175, 9);
    expect(MOTOR_MIXES.hover).toEqual([
      DEMO_HOVER_SHARE,
      DEMO_HOVER_SHARE,
      DEMO_HOVER_SHARE,
      DEMO_HOVER_SHARE,
    ]);
    const up = DEMO_HOVER_SHARE + DEMO_MIX_DELTA;
    const down = DEMO_HOVER_SHARE - DEMO_MIX_DELTA;
    expect(MOTOR_MIXES.forward).toEqual([up, down, up, down]);
    expect(MOTOR_MIXES.roll).toEqual([down, down, up, up]);
    expect(MOTOR_MIXES.yaw).toEqual([down, up, up, down]);
    expect(MOTOR_MIXES.climb).toEqual([up, up, up, up]);
    MOVE_IDS.forEach((move) => expect(MOTOR_MIXES[move]).toHaveLength(4));
  });

  it('names the motors that speed up for each move', () => {
    expect(speedingMotors('hover')).toEqual(MOTOR_PART_IDS);
    expect(speedingMotors('forward')).toEqual(['motorRearRight', 'motorRearLeft']);
    expect(speedingMotors('roll')).toEqual(['motorRearLeft', 'motorFrontLeft']);
    expect(speedingMotors('yaw')).toEqual(['motorFrontRight', 'motorRearLeft']);
    expect(speedingMotors('climb')).toEqual(MOTOR_PART_IDS);
  });
});
