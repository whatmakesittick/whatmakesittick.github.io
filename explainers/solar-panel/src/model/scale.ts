export const UNITS_PER_CM = 1;

export function cm(centimetres: number): number {
  return centimetres * UNITS_PER_CM;
}

export function mm(millimetres: number): number {
  return cm(millimetres / 10);
}

export function m(metres: number): number {
  return cm(metres * 100);
}

export type Extent = readonly [min: number, max: number];

export const TERRACE = { x: [-350, 350] as Extent, z: [-250, 250] as Extent, y: 0 } as const;
export const HOUSE_WALL_BOTTOM_CM = -260;
export const PARAPET = { height: 40, thickness: 20 } as const;
export const BULKHEAD = {
  x: [-330, -190] as Extent,
  z: [-230, -30] as Extent,
  height: 240,
} as const;

export const MODULE = { width: 113.4, height: 172.2, depth: 3.0 } as const;
export const FRAME_LIP = { depth: 3.0, faceWidth: 1.2 } as const;
export const PANEL_COUNT = 3;
export const PANEL_PITCH_CM = 116;
export const HERO_PANEL_INDEX = 0;
export const HINGE = { y: 15, z: 60 } as const;

export const INVERTER = {
  position: { x: BULKHEAD.x[1], y: 130, z: -150 } as const,
  size: { width: 35, height: 45, depth: 15 } as const,
} as const;
export const METER = {
  position: { x: BULKHEAD.x[1], y: 130, z: -95 } as const,
  size: { width: 20, height: 28, depth: 10 } as const,
} as const;

export const SLICE_LIFT_CM = 80;
export const SLICE_UNITS_PER_UM = 0.25;

export const SUN_ARC_RADIUS_CM = 1100;
export const SUN_DISC_RADIUS_CM = 45;
export const SKY_RADIUS_CM = 2500;

export function panelCentreX(index: number): number {
  return (index - (PANEL_COUNT - 1) / 2) * PANEL_PITCH_CM;
}

export function panelTopHeight(tiltDeg: number): number {
  return HINGE.y + MODULE.height * Math.sin((tiltDeg * Math.PI) / 180);
}

export function panelTopZ(tiltDeg: number): number {
  return HINGE.z - MODULE.height * Math.cos((tiltDeg * Math.PI) / 180);
}

export function um(micrometres: number): number {
  return micrometres * SLICE_UNITS_PER_UM;
}
