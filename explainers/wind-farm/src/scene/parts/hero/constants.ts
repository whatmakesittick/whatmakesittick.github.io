import { TURBINE_GEOMETRY } from '../../../model/layout';

export const TOWER = {
  baseRadius: TURBINE_GEOMETRY.towerBaseDiameter / 2,
  topRadius: TURBINE_GEOMETRY.towerTopDiameter / 2,
  topY: TURBINE_GEOMETRY.towerTopY,
  segments: 64,
  flangeSegments: 48,
  flangeYs: [26, 52, 78],
  flangeHeight: 0.22,
  flangeProud: 0.045,
  topFlange: { height: 0.32, proud: 0.14 },
} as const;

export const PLINTH = {
  radius: TURBINE_GEOMETRY.foundationRadius,
  chamferRadius: 4.65,
  shoulderY: 0.32,
  topY: 0.6,
  buriedY: -0.4,
  segments: 64,
} as const;

export const NACELLE = TURBINE_GEOMETRY.nacelle;
export const COOLER = TURBINE_GEOMETRY.cooler;
export const HUB = TURBINE_GEOMETRY.hub;
export const SHAFT_Y = TURBINE_GEOMETRY.shaftY;

export function towerRadiusAt(y: number): number {
  const share = y / TOWER.topY;
  return TOWER.baseRadius + (TOWER.topRadius - TOWER.baseRadius) * share;
}
