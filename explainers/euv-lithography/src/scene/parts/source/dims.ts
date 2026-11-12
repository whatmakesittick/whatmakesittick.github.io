import {
  BEAM_TRANSPORT,
  COLLECTOR,
  DRIVE_LASER_ROOM,
  DROPLET_GENERATOR,
  VESSEL,
  waypoint,
} from '../../../model/layout';

export const [HEAD_X, END_X] = VESSEL.xRange;
export const AXIS_Y: number = VESSEL.centreY;
export const SHELL_R: number = VESSEL.radius;
export const HEAD_DEPTH = 0.25;
export const PORT_R = 0.17;
export const BODY_START = HEAD_X + HEAD_DEPTH;
export const BODY_END = -1.6;
export const NECK_START = -0.62;
export const NECK_R = 0.11;
export const SKIN_GAP = 0.035;
export const HEAD_STEPS = 8;
export const WALL_STEPS = 2;

export const WINDOW = { x0: -3.3, x1: -2.7, half: 0.32 } as const;
export const STREAM_SLOT = 0.1;

export const FOCUS_X = waypoint('focus')[0];
export const PLASMA_X = waypoint('plasma')[0];
export const [BOX_X, BOX_Y, BOX_Z] = BEAM_TRANSPORT[1];
export const BOX_SIZE = 0.4;
export const TUBE_R = 0.12;
export const ROOF_Y = DRIVE_LASER_ROOM.centre[1] + DRIVE_LASER_ROOM.size[1] / 2;
export const ROOM_CENTRE_X = DRIVE_LASER_ROOM.centre[0];

export const COLLECTOR_RIM_R = COLLECTOR.rimRadius;
export const COLLECTOR_APEX_X = COLLECTOR.apexX;
export const COLLECTOR_RIM_X = COLLECTOR.rimX;
export const COLLECTOR_AXIAL = 1.6;
export const COLLECTOR_THICKNESS = 0.05;

export const GENERATOR = {
  x: DROPLET_GENERATOR.centre[0],
  y: DROPLET_GENERATOR.centre[1],
  size: DROPLET_GENERATOR.size[0],
  nozzleY: waypoint('nozzle')[1],
} as const;
export const VESSEL_TOP_Y = AXIS_Y + SHELL_R;
