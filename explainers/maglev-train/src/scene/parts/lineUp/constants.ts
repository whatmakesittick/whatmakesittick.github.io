import {
  CUT_X,
  GIRDER,
  LINE_UP,
  LINE_UP_SPACING,
  MAGNETS,
  STATOR,
  STATOR_BOTTOM,
  mm,
} from '../../../model';
import type { BodyOutline } from './profile';

export const SLICE = { start: CUT_X - LINE_UP.sliceLength, end: CUT_X } as const;

export const PLINTH = {
  bottom: GIRDER.bottom,
  top: LINE_UP.plinthTop,
  overhang: 0.2,
  chamfer: 0.06,
  slab: 0.16,
  slabLip: 0.05,
  baseInset: 0.08,
} as const;

export const SEAT = {
  width: 0.46,
  cushion: 0.42,
  cushionHeight: 0.12,
  backTop: 1.12,
  backWidth: 0.42,
  radius: 0.06,
} as const;

export const CUT_FACE_LIFT = { cabin: 0.006, detail: 0.01, accent: 0.014 } as const;

const L0_FLOOR = LINE_UP.plinthTop;
const L0_GAP = mm(LINE_UP.scmaglev.gapMm);
const L0_MAGNET_CLEARANCE = 0.1;
const L0_HALF_WIDTH = LINE_UP.scmaglev.width / 2;
const L0_MAGNET_DEPTH = 0.28;
const L0_COIL_FACE = L0_HALF_WIDTH + L0_MAGNET_DEPTH + L0_MAGNET_CLEARANCE;
const L0_LEVITATION_COIL = 0.05;
const L0_PROPULSION_COIL = 0.06;
const L0_WALL_FACE = L0_COIL_FACE + L0_LEVITATION_COIL + L0_PROPULSION_COIL;
const L0_WALL_THICKNESS = 0.3;

export const L0 = {
  z: -LINE_UP_SPACING,
  floor: L0_FLOOR,
  gap: L0_GAP,
  bottom: L0_FLOOR + L0_GAP,
  outline: {
    halfWidth: L0_HALF_WIDTH,
    height: LINE_UP.scmaglev.height,
    bottomHalf: 1.15,
    bottomRise: 0.35,
    shoulder: 1.55,
    roofHalf: 0.55,
  } satisfies BodyOutline,
  shell: 0.07,
  cabinFloor: 0.95,
  seats: [-0.98, -0.5, 0.5, 0.98],
  windows: { from: 1.75, to: 2.15, thickness: 0.018 },
  magnet: {
    depth: L0_MAGNET_DEPTH,
    height: 0.5,
    centre: 0.72,
    length: 2.2,
    starts: [SLICE.start + 0.4, SLICE.end - 2.2 - 0.002],
    coilWidth: 0.16,
    coilHeight: 0.3,
    clearance: L0_MAGNET_CLEARANCE,
    radius: 0.06,
  },
  coils: {
    face: L0_COIL_FACE,
    levitation: L0_LEVITATION_COIL,
    propulsion: L0_PROPULSION_COIL,
    pitch: 1,
    length: 0.92,
    nullHeight: 0.76,
    loopHeight: 0.36,
    loopGap: 0.04,
    loopRadius: 0.07,
    loopBand: 0.07,
    propulsionFrom: 0.3,
    propulsionTo: 1.2,
  },
  wall: {
    face: L0_WALL_FACE,
    thickness: L0_WALL_THICKNESS,
    height: 1.35,
    chamfer: 0.05,
  },
  plinthHalfWidth: L0_WALL_FACE + L0_WALL_THICKNESS + 0.16,
  landingWheels: {
    sideA: 0.75,
    width: 0.26,
    bottom: 0.28,
    height: 0.56,
    radius: 0.1,
    rimInset: 0.06,
    strutWidth: 0.08,
  },
} as const;

const RAIL_HEIGHT = 0.172;
const WHEEL_RADIUS = 0.46;
const BALLAST_DEPTH = 0.32;
const BALLAST_TOP = LINE_UP.plinthTop + BALLAST_DEPTH;
const SLEEPER_TOP = BALLAST_TOP + 0.08;
const RAIL_PAD = 0.01;
const RAIL_BASE = SLEEPER_TOP + RAIL_PAD;
const RAIL_TOP = RAIL_BASE + RAIL_HEIGHT;
const AXLE_Y = RAIL_TOP + WHEEL_RADIUS;
const WHEEL_RAIL_BOTTOM = RAIL_TOP + 0.95;
const GAUGE = 1.435;
const RAIL_HEAD_HALF = 0.036;

export const WHEEL_RAIL = {
  z: LINE_UP_SPACING,
  ballast: { top: BALLAST_TOP, topHalf: 1.7, slope: 1.5, tile: 0.7 },
  sleeper: { top: SLEEPER_TOP, height: 0.2, length: 2.6, width: 0.26, pitch: 0.6 },
  rail: {
    base: RAIL_BASE,
    top: RAIL_TOP,
    height: RAIL_HEIGHT,
    centre: GAUGE / 2 + RAIL_HEAD_HALF,
    headHalf: RAIL_HEAD_HALF,
  },
  clip: { width: 0.1, height: 0.05, length: 0.12, offset: 0.12 },
  wheel: { radius: WHEEL_RADIUS, backToBack: 1.36, segments: 24 },
  axle: { y: AXLE_Y, radius: 0.085, xs: [SLICE.start + 1.4, SLICE.start + 3.9] },
  bogie: {
    sideA: 1.03,
    frameWidth: 0.2,
    frameBelow: 0.1,
    frameAbove: 0.25,
    overhang: 0.65,
    transomWidth: 0.6,
    axleBox: { half: 0.15, inner: 0.85, outer: 1.12, halfHeight: 0.13 },
    airSpringRadius: 0.27,
    discRadius: 0.32,
    discThickness: 0.06,
    discA: 0.35,
  },
  outline: {
    halfWidth: 1.475,
    height: 2.7,
    bottomHalf: 1.25,
    bottomRise: 0.3,
    shoulder: 2.0,
    roofHalf: 0.85,
  } satisfies BodyOutline,
  bottom: WHEEL_RAIL_BOTTOM,
  shell: 0.07,
  cabinFloor: 0.35,
  seats: [-1.0, -0.52, 0.52, 1.0],
  windows: { from: 1.15, to: 1.6, thickness: 0.018 },
  plinthHalfWidth: 2.35,
  pantograph: {
    x: SLICE.start + 3,
    insulatorRadius: 0.055,
    insulatorHeight: 0.2,
    insulatorA: 0.35,
    insulatorX: 0.4,
    frameThickness: 0.06,
    armLength: 1.8,
    armLift: 0.32,
    headHalf: 0.8,
    headLift: 0.38,
    hornLength: 0.2,
    hornDrop: 0.08,
  },
} as const;

const TRANSRAPID_GAP_Z = -MAGNETS.support.sideZ;
const STATOR_HALF = STATOR.width / 2;

export const CALLOUTS = {
  x: CUT_X + PLINTH.overhang + PLINTH.slabLip + 0.1,
  core: 0.05,
  halo: 0.12,
  arrow: { length: 0.32, half: 0.13, halo: 0.07 },
  stem: 0.35,
  overshoot: 0.12,
  transrapid: {
    lineZ: -2.3,
    fromZ: TRANSRAPID_GAP_Z - STATOR_HALF - 0.06,
    top: STATOR_BOTTOM,
    bottom: MAGNETS.support.top,
    plate: { z: -3.7, y: (STATOR_BOTTOM + MAGNETS.support.top) / 2, width: 2.3 },
    text: '10 mm',
  },
  scmaglev: {
    lineZ: -LINE_UP_SPACING,
    extentZ: 0.45,
    top: L0_FLOOR + L0_GAP,
    bottom: L0_FLOOR,
    plate: { z: -LINE_UP_SPACING, y: 9.2, width: 2.8 },
    text: '100 mm',
  },
  plateHeight: 0.9,
  plateFontShare: 0.62,
  pixelsPerMetre: 200,
  order: { halo: 70, core: 71, plate: 72 },
} as const;
