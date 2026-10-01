import { toRadians } from '@core/math';
import {
  BARREL,
  BOLT,
  BORE,
  CARRIER,
  CARTRIDGE,
  CHAMBER,
  CLEANING_ROD,
  EJECTOR_X,
  FRONT_SIGHT,
  GAS_BLOCK,
  GAS_CYLINDER,
  GAS_PORT_ANGLE,
  GAS_PORT_X,
  GAS_TUBE,
  GRIP,
  HANDGUARD,
  MAGAZINE,
  PISTON,
  REAR_SIGHT,
  RECEIVER,
  RETURN_SPRING,
  RIFLING,
  STOCK,
  TRUNNION,
  VENT_HOLES,
} from '../model/layout';
import type { Box } from '../model/scale';
import type { PowderSpec } from './geometry/powderGrain';
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
  lips: { x: [-102, -64] as const, depth: 1.4, inner: 5.5 },
  frontLug: { x: [-41.5, -36.5] as const, y: [-17, -10.5] as const, halfWidth: 5 },
  floorPlate: { overhang: 3, thickness: 5, halfWidth: MAGAZINE.well.z[1] + 0.4, bevel: 1 },
  ribs: { offsets: [14, -12] as const, width: 2.6, height: 0.6, start: 0.06, end: 0.04 },
} as const;

const MAGAZINE_DEPTH = MAGAZINE.well.x[1] - MAGAZINE.well.x[0];
const MAGAZINE_SWEEP = toRadians(34);
const MAGAZINE_RADIUS = MAGAZINE.length / MAGAZINE_SWEEP;

export const MAGAZINE_ARC = {
  radius: MAGAZINE_RADIUS,
  front: MAGAZINE_RADIUS - MAGAZINE_DEPTH / 2,
  rear: MAGAZINE_RADIUS + MAGAZINE_DEPTH / 2,
  centre: [(MAGAZINE.well.x[0] + MAGAZINE.well.x[1]) / 2 + MAGAZINE_RADIUS, MAGAZINE.well.y[1]],
  sweep: MAGAZINE_SWEEP,
} as const;

export function magazinePoint(radius: number, angle: number): readonly [x: number, y: number] {
  const [centreX, centreY] = MAGAZINE_ARC.centre;
  return [centreX - radius * Math.cos(angle), centreY - radius * Math.sin(angle)];
}

export const MAGAZINE_BOTTOM = magazinePoint(MAGAZINE_ARC.rear, MAGAZINE_ARC.sweep)[1] - 3;

export const MAGAZINE_FRONT = magazinePoint(MAGAZINE_ARC.front, MAGAZINE_ARC.sweep)[0] + 3;

export const TRIGGER_SHAPE = { halfWidth: 3, bevel: 0.6 } as const;

export const SELECTOR_LEVER = {
  thickness: 2.4,
  bevel: 0.6,
  bossRadius: 5,
  bossHeight: 2,
  autoAngle: toRadians(-11),
  marks: { radius: 93, angles: [toRadians(-11), toRadians(-21)] as const, size: [6, 0.8] as const },
  notches: { radius: 70, angles: [0, toRadians(-11), toRadians(-21)] as const, size: 1.4 },
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

export const CASE_SHAPE = {
  rim: CARTRIDGE.rimRadius,
  groove: { x: [1.4, 2.6] as const, radius: 4.9 },
  shoulderX: CHAMBER.neckStart,
  neckX: CHAMBER.neckStart + 2.5,
  wall: 0.5,
  head: 3.2,
  pocket: { depth: 1.6, radius: CARTRIDGE.primerRadius + 0.05 },
  flashHole: 0.6,
} as const;

export const PRIMER_SHAPE = { recess: 0.05, depth: 1.55, radius: CARTRIDGE.primerRadius } as const;

export const POWDER_FILL = { start: CASE_SHAPE.head + 0.2, gap: 0.15 } as const;

export const BULLET_SHAPE = {
  heel: 1.5,
  heelRadius: 3.4,
  bearingEnd: 13.5,
  ogive: [
    [16, 3.85],
    [19, 3.4],
    [22, 2.6],
    [24.5, 1.7],
    [26.3, 0.8],
  ] as const,
  engraving: { count: 4, width: 0.8, depth: 0.3 },
} as const;

export const ROUND_SEGMENTS = 16;

export const BOLT_BODY = {
  window: [-100, -15] as const,
  rear: -110,
  stemEnd: -104,
  radius: 7.5,
  stemRadius: 6,
  chamfer: 0.6,
  pinBore: 1.9,
} as const;

export const FIRING_PIN = {
  radius: 1.5,
  tail: 3,
  travel: 1.2,
  tipRecess: 0.9,
  collar: 1.85,
} as const;

export const BOLT_LUGS = { x: [-BOLT.lugLength, -1] as const, inner: 7, halfWidth: 3.5 } as const;

export const CAM_LUG: Box = { x: [-40, -32], y: [6.5, 10.5], z: [-2.4, 2.4] };

export const RAMMER: Box = { x: [-8, 0], y: [-10.4, -6], z: [-3, 3] };

export const EXTRACTOR_SHAPE = {
  bar: { x: [-22, 0] as const, y: [-1.6, 1.6] as const, z: [6.8, 8.6] as const },
  claw: { x: [-0.5, 2.2] as const, y: [-1.4, 1.4] as const, z: [5.1, 8.6] as const },
} as const;

export const RECEIVER_RAILS = {
  x: [-235, TRUNNION.x[0]] as const,
  y: [4.6, 7.9] as const,
  reach: 3,
} as const;

export const EJECTOR_PLATE: Box = {
  x: [EJECTOR_X - 11, EJECTOR_X + 11],
  y: [-5, 11],
  z: [RECEIVER.z[0] + SHEET, RECEIVER.z[0] + SHEET + 1.2],
};

export const EJECTOR_BLOCK: Box = {
  x: [EJECTOR_X - 7, EJECTOR_X + 7],
  y: [3.5, 7.8],
  z: [RECEIVER.z[0] + SHEET + RECEIVER_RAILS.reach - 0.5, -3.5],
};

export const HAMMER_SHAPE = {
  pivot: [-115, -14] as const,
  length: 15,
  face: 3.2,
  halfWidth: 4,
  hub: 4.5,
  pin: 2,
  clearance: 0.5,
  maxAngle: toRadians(110),
  step: toRadians(1),
} as const;

export const TRIGGER_BAR = { x: [0, 50] as const, y: [-2.3, 0.5] as const, hook: 4 } as const;

export const CARRIER_SHAPE = {
  body: { x: [CARRIER.x[0], -38] as const, bottom: 8, halfWidth: 13, corner: 5, lower: 2 },
  ridge: { x: [-38, CARRIER.x[1]] as const, bottom: 20.5, halfWidth: 5.6, corner: 2 },
  springBore: { y: RETURN_SPRING.axisY, radius: 6.6, end: -45 },
} as const;

export const PISTON_SHAPE = {
  rodStart: CARRIER.x[1] - 3,
  grooves: [3, 7] as const,
  grooveDepth: 0.6,
  grooveWidth: 1.2,
  chamfer: 1,
} as const;

export const SPRING_SHAPE = {
  coils: 22,
  coilRadius: 5.2,
  wire: 0.9,
  seat: RECEIVER_SHELL.rearTrunnion[1] + 2,
  guide: [RECEIVER_SHELL.rearTrunnion[1], -180] as const,
  guideRadius: 2.4,
  tubular: 8,
  radial: 12,
} as const;

export const RETURN_SPRING_LABEL_X = -215;

export const MAGAZINE_STACK = {
  firstArc: 5.5,
  column: 4.15,
  pitch: 7.67,
  baseInset: 2,
  topSide: 1,
  follower: 4,
} as const;

export const FEED_PATH = { tilt: toRadians(12) } as const;

export const CASE_FLIGHT = {
  forward: 60,
  rise: 25,
  drop: -45,
  right: 150,
  turns: 2.5,
  roll: toRadians(50),
} as const;

export const GAS_GLOW = {
  referencePressure: 120,
  falloff: 0.6,
  ventOpenTravel: PISTON.headFrontX - VENT_HOLES.x[1],
  bore: { count: 280, size: 11, start: 1.5, caseRadius: 4, radius: 3, swirl: 0.9, alpha: 0.42 },
  port: { count: 40, size: 7, radius: 1, flow: 2.2, pressure: 30, alpha: 0.6 },
  chamber: { count: 200, size: 15, radius: 6, swirl: 0.35, frontGap: 0.6, alpha: 0.24 },
  puffs: { size: 22, reach: 3, alpha: 0.55 },
  seed: 23,
} as const;

export const VENT_WISPS = {
  count: 80,
  life: 1.1,
  rate: 90,
  speed: 34,
  rise: 26,
  drag: 1.6,
  size: 30,
  alpha: 0.3,
  seed: 31,
} as const;

export const MUZZLE_FLASH = {
  plumes: [
    { x: 6, length: 40, width: 12, tone: 'white', weight: 1 },
    { x: 16, length: 64, width: 22, tone: 'core', weight: 1 },
    { x: 42, length: 120, width: 46, tone: 'flame', weight: 0.85 },
    { x: 66, length: 170, width: 70, tone: 'ember', weight: 0.5 },
    { x: 50, length: 300, width: 200, tone: 'flame', weight: 0.3 },
  ],
  lean: toRadians(9),
  offset: 2,
  grow: 0.45,
} as const;

export const RIFLING_LANDS = { width: 1.1, lift: 0.08, step: 2 } as const;

export const CASE_GLINT = { size: 26, sharpness: 12, mouth: 30, lift: 5, phase: 0.6 } as const;

export const TRAIL = { length: 46, radius: 1.6, opacity: 0.85, segments: 12 } as const;

export const POWDER_GRAIN: PowderSpec = {
  size: 64,
  grains: 90,
  radius: [2.2, 3.4],
  period: 7,
  base: [30, 26, 20],
  grain: [96, 88, 70],
  seed: 5,
};

export const BEVELS = {
  wall: 0.35,
  cover: 0.5,
  block: 0.8,
  fine: 0.4,
  wood: 1.4,
  carrier: 0.6,
  round: 0.5,
} as const;

export const DUST_COVER_RIBS = {
  xs: [-232, -206, -180, -154, -128] as const,
  width: 5,
  height: 0.9,
  lift: 2,
} as const;

export const PIN_HEADS = {
  radius: 2.6,
  height: 0.7,
  points: [
    [-115, -14],
    [-150, -12],
    [-190, -18],
  ] as const,
} as const;

export const DOMED_RIVETS = {
  radius: 1.9,
  flatten: 0.45,
  points: [
    [-24, -13],
    [-24, 6],
    [-10, -13],
    [-10, 6],
    [-252, -14],
    [-252, 2],
    [-246, 14],
    [-205, -17],
    [-140, -17],
  ] as const,
} as const;

export const WELL_PANEL: Box = { x: [-97, -50], y: [-19, -7], z: [0, 0.45] };

export const SLING_LOOPS = {
  rear: { centre: [-432, -48, -STOCK.z[1] - 0.5] as const, radius: 6, tube: 1.2 },
  front: { centre: [GAS_BLOCK.x[0] + 9, -4, -12.6] as const, radius: 4.5, tube: 1 },
  segments: 20,
} as const;

export const HANDGUARD_VENTS = {
  xs: [92, 118, 144] as const,
  angle: toRadians(118),
  size: [14, 3.2, 1.6] as const,
} as const;

export const HANDGUARD_GROOVES = { ys: [-1, -11] as const, depth: 1, width: 1.6 } as const;
