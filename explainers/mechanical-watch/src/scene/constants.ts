import type { WheelId } from '../ids';
import { LEVELS } from '../model/scale';
import type { Span } from '../model/scale';
import type { ToothForm } from './geometry/gear';
import type { SawForm } from './geometry/gear';
import type { ArborForm } from './geometry/solids';
import type { ClubToothForm, SpokeStyle } from './geometry/wheel';

export const ANCHOR_LIFT_MM = 0.3;

export const SEGMENTS = {
  arbor: 14,
  pin: 10,
  jewel: 24,
  hub: 32,
  disc: 96,
  outline: 120,
  plate: 192,
  case: 192,
  crown: 120,
  fillet: 4,
} as const;

export const BEVEL = {
  plate: { size: 0.06, segments: 2 },
  bridge: { size: 0.07, segments: 2 },
  cock: { size: 0.08, segments: 2 },
  lever: { size: 0.02, segments: 1 },
} as const;

export const WHEEL_TOOTH: ToothForm = {
  addendum: 1.1,
  dedendum: 1.55,
  share: 0.5,
  pressureDeg: 20,
};
export const PINION_LEAF: ToothForm = {
  addendum: 0.6,
  dedendum: 1.35,
  share: 0.42,
  pressureDeg: 20,
};
export const WINDING_TOOTH: ToothForm = {
  addendum: 0.9,
  dedendum: 1.1,
  share: 0.46,
  pressureDeg: 20,
};
export const WINDING_SAW: SawForm = { depth: 0.28, hook: 0.05, land: 0.14 };
export const SAW_TOOTH_CENTRE_SHARE = 0.4;

export interface TrainWheelForm {
  readonly wheel: Span;
  readonly pinion: Span;
  readonly arbor: ArborForm;
  readonly spokes: Omit<SpokeStyle, 'rimInner'>;
  readonly rimWidth: number;
  readonly hubSpan: Span;
}

export const TRAIN_WHEELS: Readonly<Record<Exclude<WheelId, 'barrel'>, TrainWheelForm>> = {
  centreWheel: {
    wheel: [0.06, 0.2],
    pinion: LEVELS.centrePinion,
    arbor: { span: [-2.45, 2.85], radius: 0.2, pivotRadius: 0.07, pivotLength: 0.3 },
    spokes: { spokes: 5, hubRadius: 0.6, spokeWidth: 0.32, fillet: 0.14, offset: Math.PI / 2 },
    rimWidth: 0.34,
    hubSpan: [0.02, 0.26],
  },
  thirdWheel: {
    wheel: LEVELS.thirdWheel,
    pinion: [0.02, 0.44],
    arbor: { span: [-0.25, 2.9], radius: 0.075, pivotRadius: 0.05, pivotLength: 0.3 },
    spokes: { spokes: 5, hubRadius: 0.5, spokeWidth: 0.26, fillet: 0.12, offset: Math.PI / 2 },
    rimWidth: 0.28,
    hubSpan: [1.84, 2.1],
  },
  fourthWheel: {
    wheel: LEVELS.fourthWheel,
    pinion: LEVELS.fourthPinion,
    arbor: { span: [-2.55, 2.9], radius: 0.11, pivotRadius: 0.05, pivotLength: 0.3 },
    spokes: { spokes: 5, hubRadius: 0.5, spokeWidth: 0.26, fillet: 0.12, offset: Math.PI / 2 },
    rimWidth: 0.28,
    hubSpan: [0.84, 1.1],
  },
  escapeWheel: {
    wheel: LEVELS.escapeWheel,
    pinion: LEVELS.escapePinion,
    arbor: { span: [-0.25, 2.75], radius: 0.09, pivotRadius: 0.045, pivotLength: 0.3 },
    spokes: { spokes: 5, hubRadius: 0.42, spokeWidth: 0.2, fillet: 0.1, offset: Math.PI / 2 },
    rimWidth: 0.26,
    hubSpan: [1.45, 1.68],
  },
};

export const WHEEL_LABELS: Readonly<Record<WheelId, { radius: number; deg: number }>> = {
  barrel: { radius: 6.05, deg: 10 },
  centreWheel: { radius: 3.5, deg: 170 },
  thirdWheel: { radius: 2.9, deg: 0 },
  fourthWheel: { radius: 3.2, deg: 300 },
  escapeWheel: { radius: 2.3, deg: 250 },
};

export const ESCAPE_TOOTH: ClubToothForm = {
  tipRadius: 2.425,
  rootRadius: 1.9,
  heelDrop: 0.09,
  clubDeg: 5.5,
  leanDeg: 22,
  backDeg: 15,
};

export const BARREL_DRUM = {
  floor: [0.3, 0.375] as Span,
  wall: [0.75, 1.705] as Span,
  lid: [1.625, 1.705] as Span,
  wallInner: 5.63,
  wallOuter: 5.8,
  journalRadius: 0.62,
  sectorDeg: 110,
  sectorCentreDeg: 200,
} as const;

export const MAINSPRING_RIBBON = {
  span: [0.385, 1.615] as Span,
  drawnThicknessShare: 0.8,
  wallGap: 0.04,
  hookDeg: 330,
  restInnerTail: 1.4,
  outerTailPerMm: 2.2,
  minOuterTail: 0.25,
  coilSamples: 1500,
  innerTailSamples: 140,
  outerTailSamples: 50,
} as const;

export const BARREL_ARBOR = {
  pivot: { radius: 0.3, span: [-0.2, 0.1] as Span },
  journal: { radius: 0.6 },
  core: { radius: 1.2, span: [0.4, 1.6] as Span },
  square: { half: 0.62, span: [2.95, 3.4] as Span },
  hook: { width: 0.35, depth: 0.1, span: [0.6, 1.4] as Span },
  top: 3.42,
} as const;

export const RATCHET = {
  level: LEVELS.ratchetWheel,
  rimWidth: 0.5,
  spokes: { spokes: 5, hubRadius: 1.35, spokeWidth: 0.55, fillet: 0.25, offset: 0 },
  screw: { radius: 0.95, height: 0.18, slotWidth: 0.16, slotDepth: 0.08 },
} as const;

export const CROWN_WHEEL = {
  disc: LEVELS.crownWheelTeeth,
  skirt: { inner: 2.16, outer: 2.4, bottom: 1.96 },
  contrate: { tipZ: 1.77, rootShare: 0.55, tipShare: 0.28 },
  post: { radius: 0.45, span: [0, 3.0] as Span },
  boss: { radius: 0.9, span: [3.0, 3.48] as Span },
  graining: { rings: 7 },
} as const;

export const WINDING_PINION = {
  span: [9.2, 9.9] as const,
  faceTeeth: { inner: 0.45, outer: 0.72, height: 0.08 },
} as const;

export const STEM = {
  radius: 0.45,
  end: 15.9,
  groove: { at: 11.6, width: 0.3, radius: 0.34 },
} as const;

export const CROWN_KNOB = {
  neckRadius: 1.15,
  neckEnd: 15.75,
  bodyEnd: 17.15,
  endRadius: 1.55,
  flutes: 24,
  fluteDepth: 0.09,
  faceDome: 0.08,
} as const;

export const CLICK = {
  tipRadius: 4.38,
  tipDeg: 20,
  armWidth: 0.42,
  hubRadius: 0.42,
  level: [3.0, 3.34] as Span,
  spring: { anchor: { x: 8.25, y: 8.89 }, width: 0.08, bow: 0.45, level: [3.02, 3.26] as Span },
  screwRadius: 0.36,
} as const;

export const PALLETS = {
  stone: [1.44, 1.86] as Span,
  frame: [1.68, 1.84] as Span,
  stoneLength: 0.62,
  frameReach: 0.21,
  frameHalfWidth: 0.3,
  heelDrop: ESCAPE_TOOTH.heelDrop,
  unlockForkDeg: 3.25,
  impulseEndForkDeg: 3.75,
} as const;

export const FORK = {
  level: [2.15, 2.42] as Span,
  bossRadius: 0.42,
  neckHalfWidth: 0.24,
  shoulderHalfWidth: 0.3,
  bankingHalfLength: 0.16,
  slotHalfWidth: 0.225,
  hornHalfWidth: 0.56,
  jewelClearance: 0.02,
  hornSamples: 8,
  guardPin: { radius: 0.05, level: [2.02, 2.12] as Span, tipFromBalance: 0.36 },
  staff: { radius: 0.12, pivotRadius: 0.045, span: [-0.2, 2.75] as Span },
} as const;

export const BANKING_PIN = {
  radius: 0.1,
  span: [0, 2.46] as Span,
  collar: { radius: 0.17, top: 0.35 },
} as const;

export const ROLLER = {
  impulse: { radius: 1.0, level: [2.46, 2.56] as Span, flatDepth: 0.06 },
  safety: { radius: 0.42, level: [2.0, 2.14] as Span, crescentDepth: 0.12, crescentDeg: 50 },
  collar: { radius: 0.3, level: [2.0, 2.56] as Span },
} as const;

export const IMPULSE_JEWEL = {
  radius: 0.13,
  level: [2.15, 2.53] as Span,
  restDeg: 330,
} as const;

export const BALANCE_WHEEL = {
  rim: [2.96, 3.44] as Span,
  arms: [3.12, 3.34] as Span,
  armWidth: 0.5,
  hub: { radius: 0.5, span: [3.05, 3.42] as Span },
  armsDeg: 0,
  staff: [
    [0.04, -0.3],
    [0.04, 0.12],
    [0.13, 0.3],
    [0.16, 1.9],
    [0.25, 2.0],
    [0.25, 3.02],
    [0.3, 3.05],
    [0.22, 3.44],
    [0.19, 3.8],
    [0.15, 4.3],
    [0.04, 4.5],
    [0.04, 4.98],
  ] as const,
} as const;

export const HAIRSPRING_RIBBON = {
  halfWidth: 0.03,
  terminalStartDeg: 185,
  terminalEndDeg: 214,
  studDeg: 220,
  colletRadius: 0.42,
  colletHole: 0.2,
  spiralSamples: 800,
  terminalSamples: 36,
  studSamples: 8,
  innerSamples: 6,
} as const;

export const REGULATOR_ARM = {
  level: [3.98, 4.12] as Span,
  ring: { inner: 0.72, outer: 1.0 },
  pinArmDeg: 200,
  pinArmWidth: 0.34,
  pointerDeg: 20,
  pointerLength: 5.0,
  pointerWidth: 0.34,
  curbPin: { radius: 0.035, offset: 0.075, span: [3.74, 3.99] as Span },
} as const;

export const STUD_BLOCK = {
  span: [3.76, 4.38] as Span,
  size: { radial: 0.34, tangential: 0.3 },
  carrier: { level: [4.22, 4.38] as Span, inner: 0.72, outer: 1.05, width: 0.44, reach: 4.9 },
} as const;

export const BALANCE_COCK = {
  outline: [
    { x: -1.15, y: 0 },
    { x: -0.82, y: -0.82 },
    { x: 0, y: -1.15 },
    { x: 0.95, y: -0.98 },
    { x: 3.1, y: -0.6 },
    { x: 5.4, y: -1.28 },
    { x: 6.7, y: -1.5 },
    { x: 7.85, y: -1.18 },
    { x: 8.2, y: 0 },
    { x: 7.85, y: 1.18 },
    { x: 6.7, y: 1.5 },
    { x: 5.4, y: 1.28 },
    { x: 3.1, y: 0.6 },
    { x: 0.95, y: 0.98 },
    { x: 0, y: 1.15 },
    { x: -0.82, y: 0.82 },
  ],
  footDeg: 105,
  footDistance: 6.7,
  footSpread: 0.62,
  footRadius: 0.85,
  settingHole: 0.56,
  arm: LEVELS.balanceCock,
  underJewelDepth: 0.06,
} as const;

export const SHOCK_SETTING = {
  ring: { inner: 0.3, outer: 0.62, span: [4.94, 5.1] as Span },
  jewel: { radius: 0.3, span: [4.98, 5.1] as Span, dome: 0.03 },
  lyre: { radius: 0.5, openDeg: 50, hook: 0.14, width: 0.07, span: [5.1, 5.16] as Span },
} as const;

export const MAINPLATE = {
  span: LEVELS.mainplate,
  recess: { split: -0.45, centreRadius: 2.25, minuteRadius: 2.15 },
  holes: { centre: 0.36, fourth: 0.2 },
} as const;

export const BRIDGE_LEVEL = {
  barrel: [2.6, 3.0] as Span,
  train: LEVELS.bridges,
  lowArm: [2.6, 2.85] as Span,
} as const;

export const BARREL_BRIDGE = {
  barrelRadius: 6.0,
  centreRadius: 1.7,
  pillars: [
    { x: -2.5, y: 8.5 },
    { x: 7.0, y: 0.3 },
  ],
  pillarRadius: 0.72,
  pillarPostRadius: 0.4,
  crownWheelClearance: 2.58,
  window: { inner: 1.75, outer: 5.45, fromDeg: 150, toDeg: 250 },
  arborHole: 0.66,
  screws: [
    { x: -2.5, y: 8.5 },
    { x: 7.0, y: 0.3 },
    { x: -1.08, y: 0.63 },
  ],
} as const;

export const TRAIN_BRIDGE = {
  outline: [
    { x: 7.2, y: -7.9 },
    { x: 6.6, y: -9.3 },
    { x: 4.0, y: -9.3 },
    { x: 1.2, y: -8.0 },
    { x: -1.6, y: -9.6 },
    { x: -2.5, y: -10.55 },
    { x: -3.95, y: -9.95 },
    { x: -3.7, y: -8.7 },
    { x: -1.25, y: -6.7 },
    { x: -0.95, y: -5.4 },
    { x: 0.95, y: -3.05 },
    { x: 2.25, y: -2.5 },
    { x: 3.15, y: -3.3 },
    { x: 3.1, y: -4.7 },
    { x: 5.0, y: -6.55 },
  ],
  lowArmOutline: [
    { x: -0.45, y: -6.35 },
    { x: -1.65, y: -4.2 },
    { x: -2.5, y: -2.8 },
    { x: -3.6, y: -2.15 },
    { x: -4.75, y: -1.45 },
    { x: -5.4, y: -2.0 },
    { x: -4.9, y: -2.62 },
    { x: -3.6, y: -3.3 },
    { x: -2.85, y: -4.15 },
    { x: -1.45, y: -6.2 },
  ],
  feet: [
    { x: 6.2, y: -8.3 },
    { x: -3.0, y: -9.6 },
  ],
  pillarPostRadius: 0.42,
  screws: [
    { x: 6.2, y: -8.3 },
    { x: -3.0, y: -9.6 },
    { x: 1.3, y: -5.2 },
  ],
} as const;

export const JEWEL_DISC = {
  hole: { radius: 0.34, height: 0.06 },
  cap: { radius: 0.46, height: 0.04 },
  centreShare: 0.2,
  light: '#ff8aa6',
} as const;

export const SCREW_HEAD = {
  radius: 0.36,
  height: 0.16,
  dome: 0.06,
  slotWidth: 0.08,
  slotDepth: 0.07,
} as const;

export const CASE_RING = {
  lipRadius: 13.2,
  seatRadius: 12.85,
  seat: [-1.0, 0] as Span,
  lip: -2.7,
  frontRadius: 14.4,
  backRadius: 14.6,
  shoulderInset: 0.1,
  tube: { inner: 0.52, outer: 0.78, start: 13.5, end: 15.5 },
  labelDeg: -50,
} as const;

export const DIAL_FACE = {
  centreHole: 0.62,
  subDialHole: 0.26,
  subDialRadius: 3.4,
  textureSize: 2048,
  feet: [
    { x: 10.8, y: 3.2 },
    { x: -9.6, y: -5.8 },
  ],
  footRadius: 0.22,
  marker: { inner: 10.2, outer: 11.9, width: 0.42, twinGap: 0.34, height: 0.12 },
} as const;

export interface HandForm {
  readonly length: number;
  readonly tail: number;
  readonly halfWidth: number;
  readonly widestShare: number;
  readonly bossRadius: number;
  readonly ridge: number;
}

export const HANDS: Readonly<Record<'hour' | 'minute' | 'second', HandForm>> = {
  hour: {
    length: 7.4,
    tail: 1.3,
    halfWidth: 0.48,
    widestShare: 0.2,
    bossRadius: 0.62,
    ridge: 0.05,
  },
  minute: {
    length: 11.4,
    tail: 1.7,
    halfWidth: 0.4,
    widestShare: 0.16,
    bossRadius: 0.52,
    ridge: 0.05,
  },
  second: { length: 3.1, tail: 1.0, halfWidth: 0.06, widestShare: 0.5, bossRadius: 0.26, ridge: 0 },
};

export const SECOND_COUNTERWEIGHT = { radius: 0.22, at: 0.8 } as const;

export const MOTION = {
  cannonTube: { inner: 0.2, outer: 0.34 },
  hourPipe: { inner: 0.38, outer: 0.52, top: -2.15 },
  minutePinion: [-1.55, -1.1] as Span,
  minutePost: { radius: 0.16, span: [-1.62, -0.4] as Span },
  minuteSpokes: { spokes: 4, hubRadius: 0.36, spokeWidth: 0.2, fillet: 0.08, offset: 0 },
  hourSpokes: { spokes: 4, hubRadius: 0.62, spokeWidth: 0.22, fillet: 0.1, offset: Math.PI / 4 },
  rimWidth: 0.2,
} as const;

export const ENERGY_FLOW = {
  dots: 8,
  speedMmPerSecond: 1.4,
  z: 3.72,
  radius: 0.2,
  glowSize: 1.6,
  referenceDistance: 320,
  maxScale: 2.5,
} as const;
