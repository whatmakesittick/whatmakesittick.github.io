import { toRadians } from '@core/math';
import {
  BARREL,
  BORE,
  CHAMBER,
  CLEANING_ROD,
  FRONT_SIGHT,
  GAS_BLOCK,
  GAS_CYLINDER,
  GAS_PORT_ANGLE,
  GAS_PORT_X,
  GAS_TUBE,
  GRIP,
  HANDGUARD,
  MAGAZINE,
  REAR_SIGHT,
  RECEIVER,
  RIFLING,
  STOCK,
  TRUNNION,
  VENT_HOLES,
} from '../model/layout';
import type { Box } from '../model/scale';
import type { GrainSpec } from './geometry/woodGrain';

export const SEGMENTS = { barrel: 48, tube: 32, rod: 16, knob: 16 } as const;

export const SHEET = 1.2;

export const CLEARANCE = 0.2;

export const CUT_DECAL_LIFT = 0.15;

export const BORE_RADIUS = BORE.grooveRadius + CLEARANCE;

export const CASE_SHOULDER_RADIUS = 5;

export const CHAMBER_BORE = {
  base: CHAMBER.baseRadius + CLEARANCE,
  shoulder: CASE_SHOULDER_RADIUS + CLEARANCE,
  neck: CHAMBER.neckRadius + CLEARANCE,
  shoulderStart: CHAMBER.neckStart,
  neckStart: CHAMBER.neckStart + 2.5,
  neckEnd: CHAMBER.x[1],
  throatEnd: CHAMBER.x[1] + 2.3,
  leadeEnd: RIFLING.x[0],
} as const;

export const BARREL_OUTLINE = {
  breech: BARREL.radius,
  shoulderX: REAR_SIGHT.block.x[1],
  taperEndX: REAR_SIGHT.block.x[1] + 12,
  middle: 8.6,
  gasBlock: 8.3,
  front: BARREL.muzzleRadius,
  frontStartX: FRONT_SIGHT.tower.x[0],
  crown: 0.8,
} as const;

export const COMPENSATOR = {
  x: [FRONT_SIGHT.tower.x[1], FRONT_SIGHT.tower.x[1] + 18] as const,
  outer: 9,
  inner: 5,
  shortSide: 9,
  lip: { y: -Math.SQRT1_2, z: -Math.SQRT1_2 },
} as const;

export const FRONT_SIGHT_BASE = {
  top: 26,
  halfWidth: 9,
  collar: 11.5,
  ears: { x: [403, 416] as const, y: [25, 46] as const, z: [6.8, 9] as const },
  post: { halfSize: 0.8 },
} as const;

export const CLEANING_ROD_HEAD = { x: [378, 398] as const, radius: 3.4, tipRadius: 2 } as const;

export const ROD_BORE = CLEANING_ROD.radius + 0.1;

export const GAS_BLOCK_SHAPE = {
  socketEndX: GAS_CYLINDER.x[0],
  lowerEndX: 300,
  collar: 12,
  housing: 10,
  socket: GAS_TUBE.radius + 0.1,
  frontWall: GAS_BLOCK.x[1] - GAS_CYLINDER.x[1],
  lugRadius: 4,
  lugHalfWidth: 4,
} as const;

export const GAS_PORT_DECAL = {
  x: GAS_PORT_X,
  angle: GAS_PORT_ANGLE,
  width: 3,
  top: GAS_CYLINDER.axisY - GAS_CYLINDER.radius,
} as const;

export const GAS_TUBE_BORE = GAS_TUBE.radius - 1.4;

export const VENT_HOLE = {
  xs: [VENT_HOLES.x[0] + 2, VENT_HOLES.x[1] - 2] as const,
  radius: 1.8,
  elevation: toRadians(30),
} as const;

export const UPPER_HANDGUARD = {
  x: [GAS_TUBE.x[0] + 2, HANDGUARD.x[1] - 5] as const,
  outer: HANDGUARD.y[1] - GAS_TUBE.axisY + 1,
  inner: GAS_TUBE.radius + 0.15,
  outerSweep: toRadians(128),
  innerSweep: toRadians(150),
} as const;

export const LOWER_HANDGUARD = {
  x: [REAR_SIGHT.block.x[1], HANDGUARD.x[1]] as const,
  barrelBore: 10.2,
  rodBore: CLEANING_ROD.radius + 0.3,
} as const;

export const HANDGUARD_RETAINER = { x: [HANDGUARD.x[1], HANDGUARD.x[1] + 8] as const } as const;

export const REAR_SIGHT_BLOCK = {
  top: 34,
  halfWidth: 13,
  corner: 4,
  barrelBore: BARREL.radius,
  pistonBore: 5.6,
} as const;

export const REAR_SIGHT_LEAF: Box = { x: [28, 57], y: [34, 35.8], z: [-6, 6] };

export const REAR_SIGHT_NOTCH = {
  x: [26, 31] as const,
  bottom: REAR_SIGHT.y,
  top: 39,
  halfWidth: 6,
  notchHalfWidth: 2,
  base: 34,
} as const;

export const REAR_SIGHT_SLIDER: Box = { x: [40, 47], y: [33.5, 38.5], z: [-7.5, 7.5] };

export const TRUNNION_SHAPE = {
  corner: 3,
  bore: BARREL.radius,
  channelHalfWidth: 6,
  channelFloor: 18.6,
} as const;

export const RECEIVER_SHELL = {
  sideTop: 22,
  outer: RECEIVER.z[1],
  inner: RECEIVER.z[1] - SHEET,
  floorTop: RECEIVER.y[0] + SHEET,
  slot: { x: [-205, -120] as const, bottom: 17 },
  triggerOpening: { x: [-200, -176] as const, halfWidth: 5 },
  rearTrunnion: [RECEIVER.x[0], RECEIVER.x[0] + 20] as const,
} as const;

export const DUST_COVER = {
  x: [RECEIVER.x[0] + 2, TRUNNION.x[1]] as const,
  top: RECEIVER.y[1],
  sideBottom: RECEIVER_SHELL.sideTop,
  halfWidth: RECEIVER.z[1] + 0.4,
  corner: 6,
} as const;

export const RIVET = { radius: 1.8, height: 0.8 } as const;

export const RIVETS: readonly (readonly [x: number, y: number])[] = [
  [-22, -12],
  [-22, 10],
  [-8, -12],
  [-250, -12],
  [-250, 12],
  [-190, -16],
  [-150, -12],
];

export const STOCK_SHAPE = {
  frontTop: 27,
  heel: 12,
  toe: -72,
  wristBottom: -30,
  wristX: -300,
  buttPlate: 6,
  halfWidth: STOCK.z[1] - 1,
  bevel: 4,
  corner: 3,
} as const;

export const GRIP_SHAPE = {
  topFront: GRIP.x[1] - 25,
  depth: 30,
  rake: toRadians(18),
  bottom: GRIP.y[0] - 1,
  halfWidth: 13,
  bevel: 3.5,
} as const;

export const TRIGGER_GUARD_SHAPE = {
  thickness: 2.4,
  halfWidth: 4.5,
  corner: 5,
  strapEndX: -112,
  gap: 0.05,
} as const;

export const MAGAZINE_CATCH: Box = { x: [-113, -108.5], y: [-38, -22.05], z: [-7, 7] };

export const MAGAZINE_SHAPE = {
  top: MAGAZINE.well.y[1],
  halfWidth: MAGAZINE.well.z[1] - 1,
  floor: 4,
  arcSteps: 24,
  lips: { x: [-102, -64] as const, depth: 1.4, inner: 6.5 },
  frontLug: { x: [-41.5, -36.5] as const, y: [-17, -10.5] as const, halfWidth: 5 },
  floorPlate: { overhang: 2, thickness: 4, halfWidth: MAGAZINE.well.z[1] + 0.2 },
} as const;

const MAGAZINE_DEPTH = MAGAZINE.well.x[1] - MAGAZINE.well.x[0];
const MAGAZINE_RADIUS = MAGAZINE.length / MAGAZINE.tilt;

export const MAGAZINE_ARC = {
  radius: MAGAZINE_RADIUS,
  front: MAGAZINE_RADIUS - MAGAZINE_DEPTH / 2,
  rear: MAGAZINE_RADIUS + MAGAZINE_DEPTH / 2,
  centre: [(MAGAZINE.well.x[0] + MAGAZINE.well.x[1]) / 2 + MAGAZINE_RADIUS, MAGAZINE.well.y[1]],
  sweep: MAGAZINE.tilt,
} as const;

export function magazinePoint(radius: number, angle: number): readonly [x: number, y: number] {
  const [centreX, centreY] = MAGAZINE_ARC.centre;
  return [centreX - radius * Math.cos(angle), centreY - radius * Math.sin(angle)];
}

export const MAGAZINE_BOTTOM = magazinePoint(MAGAZINE_ARC.rear, MAGAZINE_ARC.sweep)[1] - 3;

export const MAGAZINE_FRONT = magazinePoint(MAGAZINE_ARC.front, MAGAZINE_ARC.sweep)[0] + 3;

export const TRIGGER_SHAPE = { halfWidth: 3, bevel: 0.6 } as const;

export const SELECTOR_LEVER = {
  thickness: 1.6,
  bossRadius: 5,
  bossHeight: 2,
  autoAngle: toRadians(-12),
  tab: { x: [80, 88] as const, y: [-12, -7] as const, height: 3.5 },
} as const;

export const CHARGING_KNOB = { radius: 6.5, length: 4, arm: { y: [17.6, 21.4] as const } } as const;

export const WOOD_GRAIN = {
  stock: {
    direction: 'u',
    along: 256,
    across: 128,
    period: [420, 110],
    bands: 9,
    waviness: 3,
    floor: 0.55,
    seed: 7,
  },
  handguard: {
    direction: 'v',
    along: 256,
    across: 128,
    period: [260, 60],
    bands: 9,
    waviness: 2,
    floor: 0.55,
    seed: 11,
  },
} as const satisfies Record<string, GrainSpec>;
