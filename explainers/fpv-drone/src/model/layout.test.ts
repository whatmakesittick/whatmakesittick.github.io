import { describe, expect, it } from 'vitest';
import { FULL_TURN } from '@core/math';
import { Route, arc, line } from '@core/path';
import { MOTOR_PART_IDS } from '../ids';
import {
  CROSSROADS,
  CROSSROADS_BOUNDS,
  DRONE,
  DRONE_LAYOUT,
  FINAL_LENGTH,
  HOMEBOUND_LENGTH,
  MOTOR_POSITIONS,
  MOTOR_SPIN,
  ORBIT,
  ORBIT_LENGTH,
  OUTBOUND_LENGTH,
  PAD,
  ROUTE_LENGTH,
  ROUTE_STEPS,
  SCENE_BOUNDS,
  START_HEADING,
  S_TURN_RADIUS,
  STATION,
  TREELINE,
} from './layout';

function route(): Route {
  return new Route({ x: PAD[0], z: PAD[2], heading: START_HEADING }, [
    line(OUTBOUND_LENGTH),
    arc(ORBIT.radius, ROUTE_STEPS.orbitTurn),
    line(HOMEBOUND_LENGTH),
    arc(S_TURN_RADIUS, ROUTE_STEPS.sTurnFirst),
    arc(S_TURN_RADIUS, ROUTE_STEPS.sTurnSecond),
    line(FINAL_LENGTH),
  ]);
}

describe('layout', () => {
  it('takes the drone dimensions from the facts sheet', () => {
    expect(DRONE.propInches).toBe(7.5);
    expect(DRONE.propDiameter).toBeCloseTo(0.1905, 4);
    expect(DRONE.blades).toBe(3);
    expect(DRONE.wheelbase).toBe(0.34);
    expect(DRONE.motorDiameter).toBe(0.035);
  });

  it('spreads the front arms wider than the rear ones, nose toward +x and right toward +z', () => {
    const { motorFrontLeft, motorFrontRight, motorRearLeft, motorRearRight } = MOTOR_POSITIONS;
    expect(motorFrontLeft[0]).toBeGreaterThan(0);
    expect(motorFrontRight[0]).toBeGreaterThan(0);
    expect(motorRearLeft[0]).toBeLessThan(0);
    expect(motorRearRight[0]).toBeLessThan(0);
    expect(motorFrontRight[2]).toBeGreaterThan(0);
    expect(motorRearRight[2]).toBeGreaterThan(0);
    expect(motorFrontLeft[2]).toBeLessThan(0);
    expect(motorRearLeft[2]).toBeLessThan(0);
    expect(Math.abs(motorFrontRight[2])).toBeGreaterThan(Math.abs(motorRearRight[2]));
    const diagonal = Math.hypot(
      motorFrontLeft[0] - motorRearRight[0],
      motorFrontLeft[2] - motorRearRight[2],
    );
    expect(diagonal).toBeCloseTo(DRONE.wheelbase, 2);
  });

  it('spins the rear right and front left motors clockwise, the other two the opposite way', () => {
    expect(MOTOR_PART_IDS).toEqual([
      'motorRearRight',
      'motorFrontRight',
      'motorRearLeft',
      'motorFrontLeft',
    ]);
    expect(MOTOR_SPIN.motorRearRight).toBe('clockwise');
    expect(MOTOR_SPIN.motorFrontLeft).toBe('clockwise');
    expect(MOTOR_SPIN.motorFrontRight).toBe('counterClockwise');
    expect(MOTOR_SPIN.motorRearLeft).toBe('counterClockwise');
  });

  it('puts the camera in the nose, the battery on top and the antennas at the back', () => {
    expect(DRONE_LAYOUT.camera[0]).toBeGreaterThan(0);
    expect(DRONE_LAYOUT.battery[1]).toBeGreaterThan(DRONE_LAYOUT.stack[1]);
    expect(DRONE_LAYOUT.videoAntenna[0]).toBeLessThan(0);
    DRONE_LAYOUT.receiverAntennas.forEach((antenna) => expect(antenna[0]).toBeLessThan(0));
  });

  it('flies out 350 m, circles the crossroads one and a half laps and comes home to the pad', () => {
    expect(OUTBOUND_LENGTH).toBe(350);
    expect(ORBIT_LENGTH).toBeCloseTo(1.5 * FULL_TURN * 35, 9);
    expect(ROUTE_LENGTH).toBeCloseTo(350 + ORBIT_LENGTH + 200 + Math.PI * 35 + 80, 9);
    const flown = route();
    expect(flown.length).toBeCloseTo(ROUTE_LENGTH, 9);
    expect(flown.end.x).toBeCloseTo(PAD[0], 6);
    expect(flown.end.z).toBeCloseTo(PAD[2], 6);
    expect(Math.cos(flown.end.heading)).toBeCloseTo(-1, 6);
  });

  it('turns left around the crossroads, which sits at the orbit centre', () => {
    expect(ORBIT.turn).toBe(-1);
    expect(CROSSROADS).toEqual([ORBIT.entryX, 0, -ORBIT.radius]);
    const flown = route();
    const halfLap = flown.poseAt((OUTBOUND_LENGTH + ORBIT_LENGTH / 3) / flown.length);
    expect(halfLap.z).toBeCloseTo(2 * CROSSROADS[2], 6);
  });

  it('keeps the station, the route and the treeline inside the scene bounds', () => {
    expect(SCENE_BOUNDS.x[0]).toBeLessThan(STATION[0]);
    expect(SCENE_BOUNDS.x[1]).toBeGreaterThan(ORBIT.entryX + ORBIT.radius);
    expect(SCENE_BOUNDS.z[0]).toBeLessThan(TREELINE.z);
    expect(SCENE_BOUNDS.z[0]).toBeLessThan(CROSSROADS[2] - ORBIT.radius);
    expect(CROSSROADS_BOUNDS.x[0]).toBeLessThan(CROSSROADS[0]);
    expect(CROSSROADS_BOUNDS.x[1]).toBeGreaterThan(CROSSROADS[0]);
  });
});
