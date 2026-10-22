import { GHOST_TRACK_Z } from '../../../../model';

const BALLAST_HEIGHT = 0.45;
const SLEEPER_RISE = 0.04;
const BASEPLATE_HEIGHT = 0.025;
const RAIL_HEIGHT = 0.176;
const GAUGE = 1.435;
const RAIL_HEAD_HALF_WIDTH = 0.0365;
const SLEEPER_TOP = BALLAST_HEIGHT + SLEEPER_RISE;
const RAIL_FOOT = SLEEPER_TOP + BASEPLATE_HEIGHT;

export const TRACK_Z = -GHOST_TRACK_Z;

export const BED = {
  ballastTop: BALLAST_HEIGHT,
  sleeperTop: SLEEPER_TOP,
  railFoot: RAIL_FOOT,
} as const;

export const RAIL = {
  height: RAIL_HEIGHT,
  centreZ: GAUGE / 2 + RAIL_HEAD_HALF_WIDTH,
  top: RAIL_FOOT + RAIL_HEIGHT,
} as const;

export const CONTACT_WIRE_RISE = 5.3;
