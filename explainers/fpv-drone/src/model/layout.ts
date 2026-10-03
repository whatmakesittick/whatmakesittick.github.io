import { FULL_TURN, toRadians } from '@core/math';
import type { MotorPartId, Point, SpinDirection } from '../ids';

export type Extent = readonly [min: number, max: number];

export interface Box {
  x: Extent;
  y: Extent;
  z: Extent;
}

const QUARTER_TURN = FULL_TURN / 4;

export const STATION: Point = [0, 0, 0];
export const PAD: Point = [6, 0, 0];
export const START_HEADING = 0;

export const HOVER_HEIGHT = 2;
export const CRUISE_HEIGHT = 40;
export const ORBIT_HEIGHT = 50;

export const ORBIT = { radius: 35, laps: 1.5, entryX: 356, turn: -1 } as const;
export const ORBIT_CENTRE: Point = [ORBIT.entryX, 0, ORBIT.turn * ORBIT.radius];
export const CROSSROADS: Point = ORBIT_CENTRE;

export const OUTBOUND_LENGTH = ORBIT.entryX - PAD[0];
export const ORBIT_LENGTH = ORBIT.laps * FULL_TURN * ORBIT.radius;
export const HOMEBOUND_LENGTH = 200;
export const S_TURN_RADIUS = 35;
export const S_TURN_LENGTH = 2 * QUARTER_TURN * S_TURN_RADIUS;
export const FINAL_LENGTH = OUTBOUND_LENGTH - HOMEBOUND_LENGTH - 2 * S_TURN_RADIUS;
export const ROUTE_LENGTH =
  OUTBOUND_LENGTH + ORBIT_LENGTH + HOMEBOUND_LENGTH + S_TURN_LENGTH + FINAL_LENGTH;

export const ROUTE_STEPS = {
  orbitTurn: ORBIT.turn * ORBIT.laps * FULL_TURN,
  sTurnFirst: ORBIT.turn * QUARTER_TURN,
  sTurnSecond: -ORBIT.turn * QUARTER_TURN,
} as const;

export const SPEED_KMH = { cruise: 70, orbit: 54 } as const;

export const TREELINE = { z: -110, x: [-40, 420] as Extent } as const;
export const ROAD = { halfWidth: 2.5 } as const;

export const SCENE_BOUNDS: Box = { x: [-40, 430], y: [0, 90], z: [-140, 110] };
export const STATION_BOUNDS: Box = { x: [-6, 10], y: [0, 4], z: [-5, 5] };
export const CROSSROADS_BOUNDS: Box = {
  x: [CROSSROADS[0] - 16, CROSSROADS[0] + 16],
  y: [0, 4],
  z: [CROSSROADS[2] - 16, CROSSROADS[2] + 16],
};
export const ROUTE_BOUNDS: Box = { x: [-10, 400], y: [0, 60], z: [-80, 10] };

export const DRONE = {
  propInches: 7.5,
  propDiameter: 0.1905,
  blades: 3,
  wheelbase: 0.34,
  armWidth: 0.018,
  armThickness: 0.006,
  plateLength: 0.27,
  plateWidth: 0.05,
  plateGap: 0.034,
  motorDiameter: 0.035,
  motorHeight: 0.021,
  standoffHeight: 0.034,
  batteryLength: 0.13,
  batteryWidth: 0.045,
  batteryHeight: 0.025,
  cameraTilt: toRadians(25),
  cameraSize: 0.019,
  restHeight: 0.035,
} as const;

export const MOTOR_POSITIONS: Readonly<Record<MotorPartId, Point>> = {
  motorRearRight: [-0.14, 0, 0.1],
  motorFrontRight: [0.11, 0, 0.13],
  motorRearLeft: [-0.14, 0, -0.1],
  motorFrontLeft: [0.11, 0, -0.13],
};

export const MOTOR_SPIN: Readonly<Record<MotorPartId, SpinDirection>> = {
  motorRearRight: 'clockwise',
  motorFrontRight: 'counterClockwise',
  motorRearLeft: 'counterClockwise',
  motorFrontLeft: 'clockwise',
};

export const DRONE_LAYOUT = {
  centre: [0, 0, 0] as Point,
  camera: [0.12, 0.02, 0] as Point,
  battery: [-0.02, 0.047, 0] as Point,
  stack: [0, 0.012, 0] as Point,
  videoAntenna: [-0.12, 0.045, 0] as Point,
  receiverAntennas: [
    [-0.13, 0.01, 0.03],
    [-0.13, 0.01, -0.03],
  ] as readonly Point[],
  gpsModule: [-0.1, 0.085, 0] as Point,
} as const;
