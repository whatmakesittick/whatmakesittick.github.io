import { RAMP } from '../../../model/layout';

export const DECK = {
  halfWidth: RAMP.width / 2,
  thickness: 0.05,
  hazardWidth: 0.36,
  plateLength: 1.5,
  sections: 120,
} as const;

export const RAIL = {
  thickness: 0.05,
  height: 0.08,
  tubeRadius: 0.032,
  tubeSegments: 8,
} as const;

export const SPINE = { halfWidth: 0.16, depth: 0.34 } as const;

export const RIB = {
  edgeDepth: 0.08,
  edgeInset: 0.04,
  hubHalfWidth: SPINE.halfWidth + 0.04,
  thickness: 0.07,
} as const;

export const CLEARANCE = { halfWidth: 1.1, height: 1.4 } as const;

export const APRON = { from: 22, to: RAMP.entryX, lift: 0.012, chamfer: 0.25 } as const;

export const RAIL_TOP = RAIL.height + RAIL.tubeRadius * 2;

export function ribDepth(across: number): number {
  const reach = DECK.halfWidth - RIB.edgeInset;
  const share = (Math.abs(across) - RIB.hubHalfWidth) / (reach - RIB.hubHalfWidth);
  const clamped = Math.min(Math.max(share, 0), 1);
  return SPINE.depth + (RIB.edgeDepth - SPINE.depth) * clamped;
}

export function ribBack(across: number): number {
  return -DECK.thickness - ribDepth(across);
}
