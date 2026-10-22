import { clamp } from '@core/math';
import {
  GAP_BAND_MM,
  GAP_MM,
  GUIDE_GAP_MM,
  INSET,
  POLE_PITCH_M,
  STATOR,
  STATOR_PACK_M,
  mm,
} from '../../../model';

const MARGIN = 0.08;
const CANTILEVER_DRAWN = 0.1;
const SLOTS_PER_POLE = 3;
const SLOT_WIDTH_SHARE = 0.45;
const SLOT_DEPTH_SHARE = 0.5;
const CABLE_FILL_SHARE = 0.84;
const POLE_STRIP_DRAWN = 0.16;
const MIN_BODY_DRAWN = 0.12;
const PACK_JOINT_DRAWN = 0.014;
const GUIDE_GAP_LIMIT_MM = 14;

export const DRAW_SCALE = INSET.alongScale;

const halfWidth = INSET.width / 2 - MARGIN;
const contentTop = INSET.height / 2 - MARGIN;
const statorTop = contentTop - CANTILEVER_DRAWN;
const statorBottom = statorTop - STATOR.height * DRAW_SCALE;
const slotPitch = (POLE_PITCH_M / SLOTS_PER_POLE) * DRAW_SCALE;
const slotWidth = slotPitch * SLOT_WIDTH_SHARE;

export const CONTENT = {
  left: -halfWidth,
  right: halfWidth,
  top: contentTop,
  bottom: -contentTop,
  width: halfWidth * 2,
} as const;

export const STATOR_DRAWING = {
  top: statorTop,
  bottom: statorBottom,
  packHalf: (STATOR_PACK_M * DRAW_SCALE) / 2,
  jointHalf: PACK_JOINT_DRAWN / 2,
  slotPitch,
  slotWidth,
  slotDepth: (statorTop - statorBottom) * SLOT_DEPTH_SHARE,
  cableRadius: (slotWidth / 2) * CABLE_FILL_SHARE,
} as const;

export const FIELD_WAVELENGTH_DRAWN = 2 * POLE_PITCH_M * DRAW_SCALE;

export const MAGNET_DRAWING = { poleStrip: POLE_STRIP_DRAWN, minBody: MIN_BODY_DRAWN } as const;

export const GAP_LIMIT_MM =
  (statorBottom - (CONTENT.bottom + POLE_STRIP_DRAWN + MIN_BODY_DRAWN)) / mm(INSET.gapScale);

export function drawnGap(gapMm: number): number {
  return clamp(gapMm, 0, GAP_LIMIT_MM) * mm(INSET.gapScale);
}

export function magnetTop(gapMm: number): number {
  return statorBottom - drawnGap(gapMm);
}

export const TOLERANCE_DRAWING = {
  top: magnetTop(GAP_BAND_MM.min),
  bottom: magnetTop(GAP_BAND_MM.max),
  floating: magnetTop(GAP_MM),
} as const;

export function leftGuidanceGapMm(lateralMm: number): number {
  return clamp(GUIDE_GAP_MM - lateralMm, 0, GUIDE_GAP_LIMIT_MM);
}

export function drawnGuidanceGap(lateralMm: number): number {
  return leftGuidanceGapMm(lateralMm) * mm(INSET.gapScale);
}

export function gapText(gapMm: number): string {
  return `${Math.round(gapMm)} mm`;
}

export function slotCentres(from: number, to: number): number[] {
  const first = Math.ceil((from + slotWidth / 2) / slotPitch - 0.5);
  const last = Math.floor((to - slotWidth / 2) / slotPitch - 0.5);
  return Array.from(
    { length: Math.max(0, last - first + 1) },
    (_, index) => (first + index + 0.5) * slotPitch,
  );
}
