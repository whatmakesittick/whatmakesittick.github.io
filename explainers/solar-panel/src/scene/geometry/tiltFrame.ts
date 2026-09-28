import { toRadians } from '@core/math';
import { HINGE, MODULE } from '../../model';

const RIGHT_ANGLE_DEG = 90;

export const RAIL = {
  offset: 31.75,
  width: 4,
  depth: 4,
  end: MODULE.height - 12,
} as const;

export const STRUT = {
  attach: 120,
  outerRadius: 1.7,
  innerRadius: 1.15,
  outerShare: 0.56,
  innerShare: 0.56,
  segments: 10,
} as const;

export const BASE_RAIL = {
  width: 4,
  height: 4,
  z: [HINGE.z - STRUT.attach - 36, HINGE.z + 30],
} as const;

export const BALLAST = { width: 16, height: 6, length: 24 } as const;
export const AXLE = { radius: 2, segments: 12 } as const;
export const POST = { width: 4, depth: 4 } as const;
export const HINGE_BRACKET = { width: 6, size: 6 } as const;

export interface SidePoint {
  y: number;
  z: number;
}

export function pivotPoint(tiltDeg: number, localY: number, localZ: number): SidePoint {
  const tilt = toRadians(tiltDeg);
  return {
    y: HINGE.y + localY * Math.sin(tilt) + localZ * Math.cos(tilt),
    z: HINGE.z - localY * Math.cos(tilt) + localZ * Math.sin(tilt),
  };
}

export function pivotLean(tiltDeg: number): number {
  return -toRadians(RIGHT_ANGLE_DEG - tiltDeg);
}

export interface StrutEnds {
  foot: SidePoint;
  top: SidePoint;
}

export function strutEnds(tiltDeg: number): StrutEnds {
  return {
    foot: { y: BASE_RAIL.height, z: HINGE.z - STRUT.attach },
    top: pivotPoint(tiltDeg, STRUT.attach, -RAIL.depth),
  };
}

export function strutLength(tiltDeg: number): number {
  const { foot, top } = strutEnds(tiltDeg);
  return Math.hypot(top.y - foot.y, top.z - foot.z);
}

export function railOffsets(): readonly number[] {
  return [-RAIL.offset, RAIL.offset];
}
