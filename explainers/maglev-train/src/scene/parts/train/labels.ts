import type { PartId, Point } from '../../../ids';
import { ARM_ANCHOR, MAGNETS, SECTION_EXTENTS, SKIDS, TRAIN } from '../../../model';
import { ARM, SKID, SKIRT } from './constants';
import { LEAD_SECTION, TAIL_SECTION, TRAIN_LAYOUT } from './layout';

type TrainPart = Extract<
  PartId,
  'train' | 'wrapArms' | 'supportMagnets' | 'guidanceMagnets' | 'eddyBrakes' | 'skids'
>;

const LEAD = TRAIN_LAYOUT[LEAD_SECTION];
const TAIL = TRAIN_LAYOUT[TAIL_SECTION];
const ARM_X = ARM_ANCHOR[0];
const LABEL_SECTION = 1;
const SUPPORT_LABEL_SHIFT_M = 1.8;
const GUIDANCE_BACK = MAGNETS.guidance.faceZ + MAGNETS.guidance.depth;
const SUPPORT_BOTTOM = MAGNETS.support.top - MAGNETS.support.height;

function nearest(slots: readonly number[], x: number): number {
  return slots.reduce((best, slot) => (Math.abs(slot - x) < Math.abs(best - x) ? slot : best));
}

function windowNear(arms: readonly number[], x: number): number {
  const windows = arms.slice(1).map((arm, index) => (arm + arms[index]) / 2);
  return nearest(windows, x);
}

function tailEddyWindow(): number {
  const [from, to] = TAIL.modules[TAIL.eddyModules[0]];
  return (from + to) / 2;
}

const WINDOW_X = windowNear(LEAD.arms, ARM_X);
const SUPPORT_WINDOW_X = windowNear(LEAD.arms, ARM_X + SUPPORT_LABEL_SHIFT_M);
const [ROOF_FROM, ROOF_TO] = SECTION_EXTENTS[LABEL_SECTION];

export const LABEL_POINTS: Readonly<Record<TrainPart, Point>> = {
  train: [(ROOF_FROM + ROOF_TO) / 2, TRAIN.roof, 0],
  wrapArms: [nearest(LEAD.arms, ARM_X), (ARM.bottom + SKIRT.bottom) / 2, -SKIRT.outerZ],
  supportMagnets: [SUPPORT_WINDOW_X, SUPPORT_BOTTOM, -MAGNETS.support.sideZ],
  guidanceMagnets: [WINDOW_X, MAGNETS.guidance.centreY, -GUIDANCE_BACK],
  eddyBrakes: [tailEddyWindow(), MAGNETS.guidance.centreY, GUIDANCE_BACK],
  skids: [nearest(LEAD.skids, ARM_X), SKID.bottom, -SKIDS.stripZ],
};
