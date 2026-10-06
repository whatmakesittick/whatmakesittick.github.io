import { toRadians } from '@core/math';
import type { Extent, RegionSpec } from '@core/scene/regions';
import type { GradientAxisId, Point, RegionId } from '../ids';
import { GRADIENT_AXIS_IDS } from '../ids';
import { MILLIMETRES_PER_METRE } from './scale';

export interface Shell {
  inner: number;
  outer: number;
  halfLength: number;
}

export interface CoilRings {
  inner: number;
  outer: number;
  width: number;
  z: readonly number[];
}

export type LayerId =
  'cover' | 'vacuumVessel' | 'radiationShield' | 'heliumVessel' | 'gradientCoil';

export const FLOOR_Y = 0;
export const CEILING_Y = 3.0;
export const ISOCENTRE: Point = [0, 1.05, 0];
export const FIELD_DIRECTION: Point = [0, 0, -1];

export const MAGNET = {
  halfLength: 0.85,
  radius: 1.05,
  top: 2.33,
  baseHalfWidth: 0.75,
} as const;

export const BORE = { radius: 0.35, halfLength: MAGNET.halfLength } as const;

export const LAYERS: Readonly<Record<LayerId, Shell>> = {
  cover: { inner: BORE.radius, outer: MAGNET.radius, halfLength: MAGNET.halfLength },
  vacuumVessel: { inner: 0.46, outer: 0.98, halfLength: 0.8 },
  radiationShield: { inner: 0.52, outer: 0.9, halfLength: 0.76 },
  heliumVessel: { inner: 0.56, outer: 0.85, halfLength: 0.72 },
  gradientCoil: { inner: 0.39, outer: 0.46, halfLength: 0.7 },
};

export const MAIN_COILS: CoilRings = {
  inner: 0.62,
  outer: 0.7,
  width: 0.08,
  z: [-0.62, -0.38, -0.12, 0.12, 0.38, 0.62],
};

export const SHIELD_COILS: CoilRings = { inner: 0.8, outer: 0.84, width: 0.08, z: [-0.5, 0.5] };

export const SHIMS = {
  radius: 0.47,
  count: 12,
  width: 0.04,
  thickness: 0.01,
  halfLength: 0.6,
} as const;

const GRADIENT_SHELL_ORDER: readonly GradientAxisId[] = ['z', 'y', 'x'];

export function gradientShell(axis: GradientAxisId): Shell {
  const { inner, outer, halfLength } = LAYERS.gradientCoil;
  const thickness = (outer - inner) / GRADIENT_AXIS_IDS.length;
  const from = inner + GRADIENT_SHELL_ORDER.indexOf(axis) * thickness;
  return { inner: from, outer: from + thickness, halfLength };
}

export const BODY_COIL = { radius: 0.37, rungs: 16, halfLength: 0.3, rungRadius: 0.006 } as const;

export const COLD_HEAD = { centre: [0, 2.05, -0.35] as Point, top: MAGNET.top, radius: 0.16 };

export const QUENCH_PIPE = {
  x: COLD_HEAD.centre[0],
  z: COLD_HEAD.centre[2],
  from: COLD_HEAD.top,
  to: CEILING_Y,
  radius: 0.06,
} as const;

export const TABLE = {
  top: 0.92,
  z: [0.85, 3.1] as Extent,
  halfWidth: 0.3,
  cradleZ: [-0.35, 3.1] as Extent,
  cradleHalfWidth: 0.22,
  cradleThickness: 0.04,
};

export const PATIENT = { head: ISOCENTRE, headRadius: 0.1, feetZ: 1.75, halfWidth: 0.22 } as const;

export const HEAD_COIL = { centre: ISOCENTRE, radius: 0.15, length: 0.3 } as const;

export const SLICE_THICKNESS = 5 / MILLIMETRES_PER_METRE;

export const ROOM = { x: [-3, 3] as Extent, z: [-2, 3] as Extent, height: CEILING_Y };

export const CONTROL_WINDOW = { x: ROOM.x[1], centreZ: 1.0, width: 1.4, sill: 0.9, top: 2.0 };

const SCREEN_MOUNT = { wallStandoff: 0.34, windowGap: 0.6, height: 1.55 } as const;

export const SCREEN = {
  centre: [
    ROOM.x[1] - SCREEN_MOUNT.wallStandoff,
    SCREEN_MOUNT.height,
    CONTROL_WINDOW.centreZ - CONTROL_WINDOW.width / 2 - SCREEN_MOUNT.windowGap,
  ] as Point,
  width: 0.9,
  height: 0.6,
  yawTowardTable: toRadians(25),
};

export const VOXEL = { centre: [0, 1.75, 1.35] as Point, size: 0.36, perSide: 4 } as const;

export const VOXEL_ARROWS = VOXEL.perSide ** 3;

export const VOXEL_LEADER: { from: Point; to: Point } = {
  from: [VOXEL.centre[0], VOXEL.centre[1] - VOXEL.size / 2, VOXEL.centre[2]],
  to: [ISOCENTRE[0], ISOCENTRE[1] + PATIENT.headRadius, ISOCENTRE[2]],
};

export const MAIN_FIELD_ARROW = {
  tail: [VOXEL.centre[0] + 0.32, VOXEL.centre[1], VOXEL.centre[2] + 0.2] as Point,
  length: 0.4,
};

export const REGIONS: Readonly<Record<RegionId, RegionSpec>> = {
  room: {
    x: [-MAGNET.radius, ROOM.x[1]],
    y: [FLOOR_Y, MAGNET.top],
    z: [-MAGNET.halfLength, ROOM.z[1]],
  },
  scanner: {
    x: [-MAGNET.radius, MAGNET.radius],
    y: [FLOOR_Y, MAGNET.top],
    z: [-MAGNET.halfLength, MAGNET.halfLength],
  },
  layers: {
    x: [ISOCENTRE[0] - BORE.radius, MAGNET.radius],
    y: [ISOCENTRE[1] - BORE.radius, MAGNET.top],
    z: [-MAGNET.halfLength, MAGNET.halfLength],
  },
  voxel: {
    x: [VOXEL.centre[0] - VOXEL.size / 2, MAIN_FIELD_ARROW.tail[0]],
    y: [VOXEL.centre[1] - VOXEL.size / 2, VOXEL.centre[1] + VOXEL.size / 2],
    z: [VOXEL.centre[2] - VOXEL.size / 2, VOXEL.centre[2] + VOXEL.size / 2],
  },
  bore: {
    x: [-BORE.radius, BORE.radius],
    y: [ISOCENTRE[1] - BORE.radius, ISOCENTRE[1] + BORE.radius],
    z: [-BORE.halfLength, BORE.halfLength],
  },
  console: {
    x: [SCREEN.centre[0] - SCREEN.height, ROOM.x[1]],
    y: [CONTROL_WINDOW.sill, CONTROL_WINDOW.top],
    z: [SCREEN.centre[2] - SCREEN.width / 2, CONTROL_WINDOW.centreZ - CONTROL_WINDOW.width / 4],
  },
};
