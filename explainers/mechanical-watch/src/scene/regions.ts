import type { Box3, Matrix4 } from 'three';
import { regionFromSpec } from '@core/scene/regions';
import type { RegionSpec } from '@core/scene/regions';
import type { RegionId } from '../ids';
import { WHEEL_IDS } from '../ids';
import {
  BALANCE,
  BALANCE_CENTRE,
  CROWN_SIDE,
  MINUTE_WHEEL_CENTRE,
  WHEEL_CENTRES,
} from '../model/layout';
import type { Point } from '../model/layout';
import {
  CASE_HEIGHT_MM,
  CASE_OUTER_RADIUS_MM,
  CROWN_RADIUS_MM,
  CROWN_SPAN_X_MM,
  DIAL_RADIUS_MM,
  LEVELS,
  MOVEMENT_RADIUS_MM,
  mm,
} from '../model/scale';
import type { Span } from '../model/scale';
import { MOTION_WORKS, wheelSpec } from '../model/train';
import { BALANCE_COCK, ROLLER, SHOCK_SETTING, TRAIN_WHEELS } from './constants';

const MARGIN_MM = 0.2;
const BARREL_REACH_MM = 6.2;
const MOTION_REACH_MM = 2.0;
const CROWN_END_X = CROWN_SIDE < 0 ? CROWN_SPAN_X_MM[0] : CROWN_SPAN_X_MM[1];

interface Extent2 {
  readonly x: Span;
  readonly y: Span;
}

function box(extent: Extent2, z: Span): RegionSpec {
  return {
    x: [mm(extent.x[0]), mm(extent.x[1])],
    y: [mm(extent.y[0]), mm(extent.y[1])],
    z: [mm(z[0]), mm(z[1])],
  };
}

function around(centres: readonly (Point & { r: number })[]): Extent2 {
  return {
    x: [Math.min(...centres.map((c) => c.x - c.r)), Math.max(...centres.map((c) => c.x + c.r))],
    y: [Math.min(...centres.map((c) => c.y - c.r)), Math.max(...centres.map((c) => c.y + c.r))],
  };
}

function trainExtent(): Extent2 {
  return around(
    WHEEL_IDS.filter((id) => id !== 'barrel').map((id) => ({
      ...WHEEL_CENTRES[id],
      r: wheelSpec(id).radiusMm + MARGIN_MM,
    })),
  );
}

function specs(): Readonly<Record<RegionId, RegionSpec>> {
  const barrel = WHEEL_CENTRES.barrel;
  const escape = WHEEL_CENTRES.escapeWheel;
  const square = (radius: number): Extent2 => ({ x: [-radius, radius], y: [-radius, radius] });
  return {
    scene: box(
      {
        x: [
          Math.min(-CASE_OUTER_RADIUS_MM, CROWN_END_X),
          Math.max(CASE_OUTER_RADIUS_MM, CROWN_END_X),
        ],
        y: [-CASE_OUTER_RADIUS_MM, CASE_OUTER_RADIUS_MM],
      },
      CASE_HEIGHT_MM,
    ),
    movement: box(square(MOVEMENT_RADIUS_MM), [LEVELS.mainplate[0], SHOCK_SETTING.lyre.span[1]]),
    barrel: box(
      {
        x: [
          Math.min(barrel.x - BARREL_REACH_MM, CROWN_END_X),
          Math.max(barrel.x + BARREL_REACH_MM, CROWN_END_X),
        ],
        y: [-CROWN_RADIUS_MM, barrel.y + BARREL_REACH_MM],
      },
      [LEVELS.barrelDrum[0], LEVELS.ratchetWheel[1]],
    ),
    train: box(trainExtent(), [TRAIN_WHEELS.centreWheel.wheel[0], LEVELS.bridges[1]]),
    escapement: box(
      around([
        { ...escape, r: wheelSpec('escapeWheel').radiusMm + MARGIN_MM },
        { ...BALANCE_CENTRE, r: ROLLER.impulse.radius + MARGIN_MM },
      ]),
      [LEVELS.palletBody[0], ROLLER.impulse.level[1]],
    ),
    balance: box(around([{ ...BALANCE_CENTRE, r: BALANCE.radiusMm + MARGIN_MM }]), [
      LEVELS.balanceWheel[0],
      BALANCE_COCK.arm[1],
    ]),
    dial: box(square(DIAL_RADIUS_MM), [LEVELS.secondHand[0], LEVELS.dial[1]]),
    motionWorks: box(
      around([
        { x: 0, y: 0, r: MOTION_WORKS.hourWheel.radiusMm + MARGIN_MM },
        { ...MINUTE_WHEEL_CENTRE, r: MOTION_REACH_MM },
      ]),
      LEVELS.cannonPinionTube,
    ),
  };
}

const SPECS = specs();

export function regionBox(id: RegionId, rootMatrix: Matrix4): Box3 {
  return regionFromSpec(SPECS[id]).applyMatrix4(rootMatrix);
}
