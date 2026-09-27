import { FABRIC_TOP, HOOK, HOOK_POINT_HEIGHT, NEEDLE } from '../model';

export const SCENE_UNITS_PER_MM = 0.05;
export const CAMERA_DISTANCE_MM = { min: 50, max: 1490 } as const;

export const BED = { height: 60, top: -0.4, cornerRadius: 6 } as const;
export const FREE_ARM = { left: -75, right: 70, halfDepth: 36 } as const;
export const WINDOW = { left: -35, right: 45, shell: 3, rim: 2.6 } as const;
export const BASE = { left: 70, right: 330, halfDepth: 75, cornerRadius: 16 } as const;

export const PILLAR = {
  left: 238,
  right: 320,
  front: 28,
  back: -72,
  top: 200,
  cornerRadius: 14,
} as const;

export const ARM = {
  left: -30,
  right: 320,
  bottom: 150,
  top: 215,
  front: 35,
  back: -45,
  cornerRadius: 18,
} as const;

export const HEAD = {
  left: -50,
  right: 30,
  bottom: 72,
  top: 222,
  front: 45,
  back: -45,
  cornerRadius: 10,
} as const;

export const FACE_PLATE = { inset: 1.2, thickness: 1.5, margin: 8 } as const;

export const DIAL = {
  x: 279,
  y: 120,
  radius: 15,
  depth: 6,
  pointerLength: 10,
  pointerHalfWidth: 1,
  pointerDepth: 1,
} as const;

export const HANDWHEEL = {
  inner: 320,
  width: 22,
  radius: 40,
  hubRadius: 17,
  hubDepth: 4,
  gripTube: 2.2,
  y: 182,
  z: -8,
  markerSize: 5,
  markerDepth: 1,
} as const;

export const SPOOL = {
  x: 190,
  z: -12,
  pinRadius: 2,
  pinHeight: 62,
  windRadius: 12,
  flangeRadius: 15,
  flangeThickness: 2.5,
  height: 44,
  lift: 3,
} as const;

export const SPOOL_BOTTOM = ARM.top + SPOOL.lift;
export const SPOOL_TOP = SPOOL_BOTTOM + SPOOL.height;

export const TENSION = {
  x: 15,
  y: 140,
  face: HEAD.front + 4,
  bossRadius: 11,
  discRadius: 9,
  discThickness: 1.6,
  gap: 1.4,
  studRadius: 1.6,
  knobRadius: 6.5,
  knobDepth: 7,
  knobTurnDegrees: 60,
  ridgeWidth: 1.6,
  ridgeDepth: 1,
  labelReach: 0.7,
} as const;

export const TENSION_GAP_Z = TENSION.face + TENSION.discThickness + TENSION.gap / 2;

export const THREAD_GUIDES = {
  top: { x: 22, y: HEAD.top + 4, z: TENSION_GAP_Z, bracketBack: HEAD.front - 7, bracketHeight: 2 },
  check: { x: 7, y: 128, z: TENSION_GAP_Z + 1.2, length: 8.5 },
  face: { x: -2, y: HEAD.bottom - 4, z: HEAD.front + 3 },
  faceOverlap: 6,
  postRadius: 1.1,
  eyeRadius: 1.6,
  eyeTube: 0.45,
} as const;

export const TAKE_UP = {
  pivotX: 40,
  pivotY: 177,
  length: 52,
  lowDegrees: -25,
  highDegrees: 25,
  barWidth: 5,
  barThickness: 2,
  barZ: HEAD.front + 1.5,
  eyeRadius: 2.4,
  eyeTube: 0.8,
  bossRadius: 6,
  bossDepth: 5,
} as const;

export const TAKE_UP_EYE_Z = TAKE_UP.barZ + TAKE_UP.barThickness / 2;

export const NEEDLE_BAR_SHAPE = {
  radius: 3.5,
  length: 55,
  clampBottom: 34,
  clampTop: 44,
  clampHalf: 4,
  screwRadius: 1.8,
  screwLength: 4,
  guideAbove: 2,
  guideZ: 5.4,
  guideRadius: 1.1,
  guideTube: 0.35,
} as const;

export const NEEDLE_SHAPE = {
  length: 38,
  tipLength: 1.4,
  eyeBottom: NEEDLE.eyeAboveTip - 0.9,
  eyeTop: NEEDLE.eyeAboveTip + 0.9,
  eyeHalfGap: 0.34,
  scarfTop: NEEDLE.eyeAboveTip + 0.9 + 1.8,
  scarfFlatten: 0.62,
  bladeTop: 28,
  shankBottom: 30,
  shankRadius: 1,
  grooveTop: 26,
  segments: 12,
} as const;

export const GROOVE_Z = NEEDLE.radius + 0.02;

export const PRESSER = {
  soleBottom: FABRIC_TOP + 0.7,
  soleThickness: 1.4,
  left: -7,
  right: 7,
  back: -12,
  front: 9,
  cornerRadius: 2,
  slotHalfWidth: 1.6,
  slotHalfLength: 2.4,
  toeLength: 6,
  toeLiftDegrees: 28,
  shank: { left: -3, right: 3, back: -15, front: -7, top: 24 },
  barRadius: 3.2,
  barZ: -11,
  screwRadius: 2.4,
} as const;

export const PLATE = {
  left: -28,
  right: 40,
  back: -30,
  front: 30,
  cornerRadius: 4,
  holeHalfWidth: 2,
  holeHalfLength: 1.3,
  slotX: 5.5,
  slotHalfWidth: 1.1,
  slotBack: -22.5,
  slotFront: 0,
  guides: [10, 15, 20],
  guideHalfWidth: 0.25,
  guideLift: 0.05,
  guideInset: 3,
} as const;

export const FEED_DOGS = {
  x: 5.5,
  barHalfWidth: 0.8,
  back: -19,
  front: -3,
  height: 3,
  toothHeight: 0.8,
  toothPitch: 1.6,
  crossDepth: 3,
  crossHeight: 2,
} as const;

export const HOOK_BODY = {
  wallInner: 14,
  wallOuter: 14.8,
  wallTop: -4.5,
  wallBottom: -13.5,
  baseThickness: 1.5,
  wallSweep: 230,
  hornSweep: 40,
  hornThickness: 0.9,
  hornHeight: HOOK_POINT_HEIGHT,
  tipRadius: HOOK.pointRadius,
  shaftRadius: 2.5,
  gearTop: -22,
  gearBottom: -26,
  gearRadius: 6,
  gearTeeth: 10,
  toothDepth: 1.2,
  arcSteps: 24,
} as const;

const LOWER_GEAR_RADIUS = HOOK_BODY.gearRadius * HOOK.turnsPerStitch;

export const LOWER_SHAFT = {
  y: HOOK_BODY.gearBottom - LOWER_GEAR_RADIUS,
  radius: 2.5,
  left: -20,
  right: 300,
  gearRadius: LOWER_GEAR_RADIUS,
  gearHalfWidth: 1.5,
  gearTeeth: HOOK_BODY.gearTeeth * HOOK.turnsPerStitch,
  gearX: HOOK_BODY.toothDepth - HOOK_BODY.gearRadius,
} as const;

export const CASE_SHAPE = {
  wall: 0.8,
  floor: 0.8,
  springFrom: -38,
  springTo: -14,
  springBottom: -7.6,
  springTop: -5,
  springThickness: 0.35,
  arcSteps: 8,
} as const;

export const BOBBIN_SHAPE = {
  flangeRadius: 9.6,
  flangeThickness: 0.6,
  coreRadius: 3.2,
  windowRadius: 6.2,
  windRadius: 8.4,
  bottom: -11.1,
  top: -3.9,
} as const;

export const BOBBIN_THREAD = {
  leave: { angle: -75, height: -7.2 },
  slot: { angle: -40, radius: 10.4, height: -7.2 },
  springStart: { angle: -36, radius: 11.25, height: -6.6 },
  springEnd: { angle: -14, radius: 11.3, height: -6 },
  plateBelow: { x: 1.2, y: -2.3, z: 0.35 },
  plateTop: { x: 1.2, y: 0.15, z: -0.5 },
} as const;

export const FABRIC_SHEET = {
  left: -42,
  right: 10,
  back: -40,
  front: 36,
  fade: 14,
  segments: 19,
  opacity: { whole: 0.82, cutaway: 0.34 },
} as const;

export const ROW_END = FABRIC_SHEET.back + FABRIC_SHEET.fade / 2;

export const PLATE_OPACITY = { whole: 1, cutaway: 0.22 } as const;

export const THREAD_SHAPE = { sides: 6, upperRadius: 0.45 } as const;
