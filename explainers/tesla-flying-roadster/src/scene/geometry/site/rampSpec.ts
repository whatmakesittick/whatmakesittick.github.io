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

export const TRUSS = {
  halfWidth: 1.15,
  chord: 0.14,
  gap: 0.015,
  depth: 1.1,
  groundClear: 0.25,
} as const;

export const RIB = {
  depth: 0.12,
  edgeDepth: 0.05,
  edgeInset: 0.04,
  hubHalfWidth: TRUSS.halfWidth + TRUSS.chord / 2,
  thickness: 0.07,
} as const;

export const CLEARANCE = { halfWidth: 1.1, height: 1.4 } as const;

export const APRON = { from: RAMP.entryX - 2, to: RAMP.entryX, lift: 0.02, chamfer: 0.25 } as const;

export const RAIL_TOP = RAIL.height + RAIL.tubeRadius * 2;

export const INNER_CHORD = -DECK.thickness - TRUSS.gap - TRUSS.chord / 2;

export const OUTER_CHORD = INNER_CHORD - TRUSS.depth;

function ribDepth(across: number): number {
  const reach = DECK.halfWidth - RIB.edgeInset;
  const share = (Math.abs(across) - RIB.hubHalfWidth) / (reach - RIB.hubHalfWidth);
  const clamped = Math.min(Math.max(share, 0), 1);
  return RIB.depth + (RIB.edgeDepth - RIB.depth) * clamped;
}

export function ribBack(across: number): number {
  return -DECK.thickness - ribDepth(across);
}
