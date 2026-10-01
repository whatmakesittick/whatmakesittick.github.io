import { toRadians } from '@core/math';
import type { Box, Extent, Point } from './scale';

export interface Span {
  x: Extent;
}

export interface Tube extends Span {
  axisY: number;
  radius: number;
}

export interface Pivot {
  centre: Point;
  swing: number;
}

export const OVERALL_LENGTH = 880;

export const BARREL: Tube & { muzzleRadius: number } = {
  x: [0, 415],
  axisY: 0,
  radius: 11,
  muzzleRadius: 8,
};

export const BORE = { landRadius: 3.81, grooveRadius: 3.96, grooves: 4, twist: 240 };

export const RIFLED_LENGTH = 369;

export const RIFLING: Span = { x: [BARREL.x[1] - RIFLED_LENGTH, BARREL.x[1]] };

export const CARTRIDGE = {
  length: 56,
  caseLength: 38.7,
  rimRadius: 5.65,
  neckRadius: 4.3,
  bulletRadius: 3.96,
  bulletLength: 26.8,
  primerRadius: 2.75,
};

export const CHAMBER = {
  x: [0, CARTRIDGE.caseLength] as Extent,
  baseRadius: CARTRIDGE.rimRadius,
  neckRadius: CARTRIDGE.neckRadius,
  neckStart: 30,
};

export const BULLET_SEAT_X = CARTRIDGE.length - CARTRIDGE.bulletLength;

export const BULLET_TRAVEL = BARREL.x[1] - BULLET_SEAT_X;

export const GAS_PORT_X = 295;

export const GAS_PORT_ANGLE = toRadians(45);

export const GAS_CYLINDER: Tube = { x: [288, 320], axisY: 24, radius: 7.5 };

export const GAS_BLOCK: Box = { x: [282, 322], y: [-12, 34], z: [-12, 12] };

export const VENT_HOLES: Span = { x: [262, 272] };

export const GAS_TUBE: Tube = { x: [60, 285], axisY: 24, radius: 9 };

export const PISTON = { rodRadius: 5, headRadius: 7, headLength: 14, headFrontX: 288 };

export const RECEIVER: Box = { x: [-260, 0], y: [-22, 32], z: [-16, 16] };

export const TRUNNION: Box = { x: [-30, 12], y: [-16, 20], z: [-14, 14] };

export const CARRIER: Box = { x: [-115, -5], y: [6, 30], z: [-14, 14] };

export const CARRIER_STROKE = 130;

export const FREE_TRAVEL = 5.5;

export const BOLT = { x: [-70, 0] as Extent, radius: 10, lugLength: 12, lugCount: 2 };

export const UNLOCK_ANGLE = toRadians(36);

export const CHARGING_HANDLE: Box = { x: [-60, -40], y: [10, 24], z: [14, 34] };

export const EJECTION_PORT: Box = { x: [-120, -40], y: [0, 20], z: [14, 18] };

export const EJECTOR_X = -75;

export const RETURN_SPRING: Tube = { x: [CARRIER.x[0], -255], axisY: 18, radius: 6 };

export const HAMMER: Pivot = { centre: [-150, -12, 0], swing: toRadians(70) };

export const RETARDER_ANGLE = toRadians(40);

export const TRIGGER: Pivot = { centre: [-190, -18, 0], swing: toRadians(12) };

export const SELECTOR: Pivot = { centre: [-160, 14, 16], swing: toRadians(60) };

export const MAGAZINE = {
  well: { x: [-105, -40] as Extent, y: [-22, -10] as Extent, z: [-12, 12] as Extent },
  length: 190,
  tilt: toRadians(25),
  rounds: 30,
  columns: 2,
};

export const GRIP: Box = { x: [-215, -180], y: [-95, -22], z: [-13, 13] };

export const TRIGGER_GUARD: Box = { x: [-205, -150], y: [-50, -22], z: [-6, 6] };

export const STOCK: Box = {
  x: [-OVERALL_LENGTH + BARREL.x[1], -260],
  y: [-60, 32],
  z: [-18, 18],
};

export const HANDGUARD: Box = { x: [40, 180], y: [-26, 36], z: [-18, 18] };

export const REAR_SIGHT = { block: { x: [20, 60] as Extent }, x: 32, y: 36 };

export const FRONT_SIGHT = { tower: { x: [400, 418] as Extent }, x: 410, y: 40 };

export const CLEANING_ROD: Tube = { x: [40, 405], axisY: -14, radius: 2.5 };

const SIGHT_HEADROOM = 8;
const LEFT_SIDE_CLEARANCE = 2;

export const RIFLE_EXTENT: Box = {
  x: [STOCK.x[0], BARREL.x[1]],
  y: [GRIP.y[0], FRONT_SIGHT.y + SIGHT_HEADROOM],
  z: [STOCK.z[0] - LEFT_SIDE_CLEARANCE, CHARGING_HANDLE.z[1]],
};
