const THROAT_PLATE_THICKNESS = 2;
export const PLATE_BOTTOM = -THROAT_PLATE_THICKNESS;

export const FABRIC = {
  layers: 2,
  layerThickness: 1.8,
  lift: 0.8,
} as const;

const FABRIC_THICKNESS = FABRIC.layers * FABRIC.layerThickness;
export const FABRIC_BOTTOM = FABRIC.lift;
export const FABRIC_TOP = FABRIC_BOTTOM + FABRIC_THICKNESS;

export const THREAD_RADIUS = 0.32;

export const TENSIONS = ['loose', 'balanced', 'tight'] as const;
export type Tension = (typeof TENSIONS)[number];

const KNOT_OUTSIDE = 0.3;

const KNOT_HEIGHTS: Record<Tension, number> = {
  loose: -KNOT_OUTSIDE,
  balanced: FABRIC_THICKNESS / 2,
  tight: FABRIC_THICKNESS + KNOT_OUTSIDE,
};

export interface StitchProfile {
  topLevel: number;
  bottomLevel: number;
  topDip: number;
  bobbinRise: number;
}

export function stitchProfile(tension: Tension): StitchProfile {
  const knot = FABRIC_BOTTOM + KNOT_HEIGHTS[tension];
  const topLevel = FABRIC_TOP + THREAD_RADIUS;
  const bottomLevel = FABRIC_BOTTOM - THREAD_RADIUS;
  return {
    topLevel,
    bottomLevel,
    topDip: Math.min(topLevel, knot - THREAD_RADIUS),
    bobbinRise: Math.max(bottomLevel, knot + THREAD_RADIUS),
  };
}
