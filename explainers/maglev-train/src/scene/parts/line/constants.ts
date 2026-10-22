import {
  BEAM_M,
  GIRDER,
  GUIDANCE_RAIL,
  GUIDEWAY_TOP,
  PIER,
  SKIDS,
  STATOR,
  STATOR_BOTTOM,
  STATOR_PACK_M,
} from '../../../model';

export const DECK = {
  top: GUIDEWAY_TOP,
  edge: GIRDER.topWidth / 2,
  concreteEdge: GIRDER.topWidth / 2 - GIRDER.cantileverDepth,
  flangeUnderside: 9.98,
  haunch: { z: 0.84, y: 9.72 },
  webFoot: { z: 0.68, y: GIRDER.bottom + 0.08 },
  bottomHalf: 0.6,
  bottom: GIRDER.bottom,
  joint: 0.06,
  endChamfer: 0.04,
} as const;

export const CANTILEVER = {
  topChamfer: 0.015,
  underside: STATOR.top,
  innerFoot: 1.09,
  gussetSpacing: STATOR_PACK_M * 3,
  gussetThickness: 0.025,
  gussetFoot: { z: 0.83, y: 9.6 },
} as const;

export const STRIP = {
  width: 0.16,
  z: SKIDS.stripZ,
  thickness: 0.014,
  proud: 0.002,
} as const;

const RAIL_THICKNESS = 0.04;

export const RAIL = {
  outer: GUIDANCE_RAIL.faceZ,
  inner: GUIDANCE_RAIL.faceZ - RAIL_THICKNESS,
  top: GUIDANCE_RAIL.centreY + GUIDANCE_RAIL.height / 2,
  bottom: GUIDANCE_RAIL.centreY - GUIDANCE_RAIL.height / 2,
  chamfer: 0.006,
  tabWidth: 0.012,
  tabEvery: 2,
} as const;

export const PACKS = {
  perBeam: Math.floor(BEAM_M / STATOR_PACK_M),
  pitch: STATOR_PACK_M,
  gap: 0.014,
  inner: STATOR.sideZ - STATOR.width / 2,
  outer: STATOR.sideZ + STATOR.width / 2,
  bottom: STATOR_BOTTOM,
  top: STATOR.top,
  platesPerPack: 360,
  slotPitch: 0.086,
} as const;

export const TRAY = {
  inner: 0.82,
  outer: 1.14,
  bottom: 9.04,
  top: 9.2,
  wall: 0.012,
  bracketSpacing: BEAM_M / 10,
  bracketWidth: 0.05,
  bracketDepth: 0.05,
  bracketInner: 0.76,
} as const;

export const CABLES = {
  radius: 0.032,
  offsets: [0.9, 0.98, 1.06],
  segments: 8,
} as const;

export const PIER_SHAPE = {
  half: PIER.width / 2,
  chamfer: 0.08,
  capHalf: 1.3,
  capFlareBottom: 6.3,
  capFlareTop: 7.4,
  bearingHeight: 0.16,
  footingHalf: 1.55,
  footingChamfer: 0.18,
  footingTop: 0.32,
  footingBottom: -0.1,
  curveSegments: 6,
} as const;

export const BEARING = {
  size: 0.46,
  z: 0.42,
  x: 0.4,
  plinthSize: 0.62,
  plinthHeight: 0.05,
} as const;
