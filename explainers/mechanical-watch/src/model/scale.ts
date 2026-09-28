export const UNITS_PER_MM = 10;

export function mm(millimetres: number): number {
  return millimetres * UNITS_PER_MM;
}

export function toMillimetres(units: number): number {
  return units / UNITS_PER_MM;
}

export const MOVEMENT_RADIUS_MM = 12.8;
export const CASE_INNER_RADIUS_MM = 13.6;
export const CASE_OUTER_RADIUS_MM = 15.4;
export const DIAL_RADIUS_MM = 13.4;
export const CASE_HEIGHT_MM: Span = [-3.2, 5.8];

export type Span = readonly [bottom: number, top: number];

export const LEVELS = {
  secondHand: [-2.55, -2.4],
  minuteHand: [-2.35, -2.2],
  hourHand: [-2.15, -2.0],
  dial: [-1.9, -1.6],
  hourWheel: [-1.5, -1.2],
  minuteWheel: [-1.1, -0.8],
  cannonPinionTube: [-2.4, -0.2],
  cannonPinionLeaves: [-1.1, -0.5],
  mainplate: [-0.9, 0],
  centreWheel: [0.62, 0.75],
  centrePinion: [0.25, 1.25],
  barrelDrum: [0.3, 2.4],
  barrelTeeth: [0.3, 0.75],
  fourthWheel: [0.9, 1.05],
  fourthPinion: [1.55, 2.4],
  escapeWheel: [1.5, 1.63],
  escapePinion: [0.6, 1.3],
  thirdWheel: [1.9, 2.05],
  thirdPinion: [0.5, 1.4],
  palletBody: [1.4, 1.75],
  palletHorns: [2.15, 2.45],
  roller: [2.15, 2.5],
  bridges: [2.6, 3.2],
  windingPinion: [0.9, 1.4],
  crownWheel: [1.4, 3.4],
  crownWheelTeeth: [3.0, 3.4],
  ratchetWheel: [3.0, 3.4],
  click: [3.0, 3.4],
  balanceWheel: [3.0, 3.4],
  hairspring: [3.8, 3.95],
  regulator: [3.95, 4.4],
  balanceCock: [4.4, 5.0],
} as const satisfies Record<string, Span>;

export type LevelId = keyof typeof LEVELS;

export const STEM_AXIS_Z_MM = 1.0;
export const STEM_START_X_MM = 9.2;
export const CROWN_SPAN_X_MM: Span = [15.4, 17.4];
export const CROWN_RADIUS_MM = 1.9;

export function levelMiddle(id: LevelId): number {
  const [bottom, top] = LEVELS[id];
  return (bottom + top) / 2;
}

export function levelHeight(id: LevelId): number {
  const [bottom, top] = LEVELS[id];
  return top - bottom;
}
