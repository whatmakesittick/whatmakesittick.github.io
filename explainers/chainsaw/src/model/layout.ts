import { toRadians } from '@core/math';
import type { RegionId, SettingId } from '../ids';
import { BAR_HEEL_HALF_HEIGHT, KICKBACK_BRANCH_CENTRE, KICKBACK_BRANCH_RADIUS } from './chain';
import {
  BAR_PLANE_Z,
  CRANK_Y,
  KICKBACK_ENVELOPE_DEG,
  SAW_GEOMETRY,
  SAW_REACH,
  sweptBounds,
  unionBounds,
} from './scale';
import type { Bounds } from './scale';
import type { Point } from '../ids';

export interface LogLayout {
  centre: Point;
  radius: number;
  length: number;
  tiltDeg: number;
}

export interface SettingLayout {
  lift: number;
  log: LogLayout | null;
}

const BRANCH_LENGTH = 0.24;
const BRANCH_TILT_DEG = 45;

export const SETTING_LAYOUT: Readonly<Record<SettingId, SettingLayout>> = {
  bench: { lift: 0, log: null },
  cutting: {
    lift: 0.16,
    log: { centre: [0.3, 0.14, BAR_PLANE_Z], radius: 0.14, length: 0.6, tiltDeg: 0 },
  },
  kickback: {
    lift: 0,
    log: {
      centre: KICKBACK_BRANCH_CENTRE,
      radius: KICKBACK_BRANCH_RADIUS,
      length: BRANCH_LENGTH,
      tiltDeg: BRANCH_TILT_DEG,
    },
  },
};

function logBounds(log: LogLayout, lift: number): Bounds {
  const [x, y, z] = log.centre;
  const reach = log.radius + (log.length / 2) * Math.sin(toRadians(log.tiltDeg));
  const half = log.tiltDeg === 0 ? log.length / 2 : log.radius;
  return {
    min: [x - reach, y - lift - reach, z - half],
    max: [x + reach, y - lift + reach, z + half],
  };
}

function settingLogBounds(setting: SettingId): Bounds {
  const { log, lift } = SETTING_LAYOUT[setting];
  if (!log) throw new Error(`The ${setting} setting has no log`);
  return logBounds(log, lift);
}

const BAR_MARGIN = 0.03;

export const REGION_BOUNDS: Readonly<Record<RegionId, Bounds>> = {
  saw: unionBounds(SAW_REACH, settingLogBounds('cutting')),
  cylinder: { min: [-0.07, 0.05, -0.06], max: [0.11, 0.265, 0.06] },
  carb: { min: [-0.13, 0.05, -0.06], max: [0.05, 0.25, 0.06] },
  starter: { min: [-0.3, 0, -0.17], max: [0.15, 0.46, 0.08] },
  clutch: { min: [-0.04, 0.04, 0.05], max: [0.12, 0.16, 0.11] },
  bar: {
    min: [0.15, CRANK_Y - BAR_HEEL_HALF_HEIGHT - BAR_MARGIN, 0.07],
    max: [0.49, CRANK_Y + BAR_HEEL_HALF_HEIGHT + BAR_MARGIN, 0.105],
  },
  kickback: unionBounds(
    sweptBounds(SAW_REACH, SAW_GEOMETRY.rearGrip, KICKBACK_ENVELOPE_DEG),
    settingLogBounds('kickback'),
  ),
};
