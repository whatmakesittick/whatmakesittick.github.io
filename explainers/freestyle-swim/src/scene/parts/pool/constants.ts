import { SCROLL_PERIOD_M } from '../../../model';

export const HALF_EXTENT_M = 4.5;
export const FLOOR_Y = -2.5;
export const LANE_LINE_Y = FLOOR_Y + 0.01;
export const NEIGHBOUR_LINE_Z = 2.5;
export const NEIGHBOUR_ROPE_Z = 3.75;
export const NEIGHBOUR_LINE_MIX = 0.45;
export const FLOAT_PITCH_M = 0.15;
export const FLOAT_LENGTH_M = 0.13;
export const FLOAT_RADIUS_M = 0.075;
export const FLOAT_LIFT_M = 0.02;
export const CORD_RADIUS_M = 0.011;
export const CORD_SEGMENTS = 6;
export const FLOAT_SEGMENTS = 14;
export const ROPE_LABEL_OFFSET = { x: 0.2, y: 0.05 } as const;
export const WATERLINE_LABEL = { x: 0.6, z: 0.7 } as const;
export const LANE_LINE_LABEL_X = -0.9;
export const LAYER = { water: 1, effects: 2, arrows: 3 } as const;
export const FULL_TURN = Math.PI * 2;

export interface PoolFrame {
  uScroll: { value: number };
  uPhase: { value: number };
}

export function scrollOffset(scrollM: number): number {
  const wrapped = ((scrollM % SCROLL_PERIOD_M) + SCROLL_PERIOD_M) % SCROLL_PERIOD_M;
  return -wrapped;
}
