import { TURBINE_GEOMETRY } from '../../../../model/layout';

export const AXIS_Y = TURBINE_GEOMETRY.shaftY;
export const FLOOR_Y = TURBINE_GEOMETRY.nacelle.minY;
export const DECK_Y = TURBINE_GEOMETRY.bedplate.y;
export const ROOF_Y = TURBINE_GEOMETRY.nacelle.maxY;
export const WALL_Z = TURBINE_GEOMETRY.nacelle.halfWidth;
export const WALKWAY_Y = 103.61;
export const FRAME_TOP_Y = 103.6;

export const SEGMENTS = {
  large: 40,
  medium: 28,
  small: 16,
  drive: 12,
  bolt: 6,
  cable: 6,
  disc: 64,
  hole: 10,
} as const;

export const FAST_SHAFT_RATIO = 12;
