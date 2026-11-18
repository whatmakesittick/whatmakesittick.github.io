import { lerp } from '@core/math';
import type { RegionSpec } from '@core/scene/regions';
import type { AnchorId, OdorantId, Point, RegionId } from '../ids';

export const HEAD_BOX = { x: [-10, 10], y: [-11, 12], z: [-7, 0] } as const satisfies RegionSpec;

export const LIPS: Point = [8.8, -1.5, 0];
export const MOUTH_CENTRE: Point = [5, -1.2, 0];

export const TONGUE = {
  tip: [8, -2, 0],
  hump: [4.5, -1.2, 0],
  root: [1.2, -4, 0],
} as const satisfies Record<string, Point>;

export const TONGUE_LIFT_CM = 0.6;

export const SOFT_PALATE = { front: [3.5, 0, 0], back: [1.8, -1, 0] } as const satisfies Record<
  string,
  Point
>;

export const AIRWAY = { bottom: [1.5, -1, 0], top: [1.5, 2.5, 0] } as const satisfies Record<
  string,
  Point
>;

export const NASAL_CAVITY = { x: [2, 9], y: [0.5, 5] } as const;

export const NOSTRILS: Point = [10, 1, 0];

export const SMELL_PATCH = { centre: [5, 5.3, 0], width: 2 } as const satisfies {
  centre: Point;
  width: number;
};

export const OLFACTORY_BULB: Point = [5, 6.3, 0];

export const THROAT = { top: [1, -3, 0], bottom: [0.5, -10, 0] } as const satisfies Record<
  string,
  Point
>;

export const SPOON_STOPS = {
  sniff: [10.8, 0.2, 2.5],
  lips: [9.6, -1.5, 0],
  inMouth: [6.8, -1.6, 0],
  away: [16, -3, 3],
} as const satisfies Record<string, Point>;

export type SpoonStopId = keyof typeof SPOON_STOPS;

export const BITE_SPOT: Point = [5.5, -1, 0];
export const BITE_RADIUS_CM = 1.2;
export const THROAT_EXIT: Point = [1, -5, 0];

export const TONGUE_SURFACE_Y = 0;

export const TONGUE_PATCH = { x: [-20, 20], z: [-14, 14] } as const;

export const PAPILLA_SPACING_MM = 2.5;

export const CUT_PAPILLA = { centre: [-12, 0, 6], magnify: 3 } as const satisfies {
  centre: Point;
  magnify: number;
};

export const NERVE_Y = -3;

export const TONGUE_BITE = {
  centre: [0, 6, 0],
  radius: 9,
  meltShrink: 0.6,
  puddleRadius: 15,
} as const satisfies { centre: Point; radius: number; meltShrink: number; puddleRadius: number };

export function scoopRadius(melt: number): number {
  return TONGUE_BITE.radius * (1 - TONGUE_BITE.meltShrink * melt);
}

export function puddleRadius(melt: number): number {
  return lerp(TONGUE_BITE.radius, TONGUE_BITE.puddleRadius, melt);
}

export const LINEUP_Y = 10;

export const ODORANT_COLUMN_X: Readonly<Record<OdorantId, number>> = {
  benzaldehyde: -20,
  hexenal: -10,
  linalool: 0,
  eugenol: 10,
  ionone: 20,
};

export const COLUMN_SCATTER = 4;

export const RECEPTOR_GRID = { columns: 8, rows: 5, spacing: 4 } as const;

export const RECEPTOR_PLANE_Y = -10;

export const MUCUS = { y: [-10, -7] } as const;

export const NEURON_BOTTOM_Y = -18;

const HALF = 0.5;

export function receptorCell(index: number): Point {
  const column = index % RECEPTOR_GRID.columns;
  const row = Math.floor(index / RECEPTOR_GRID.columns);
  return [
    (column - (RECEPTOR_GRID.columns - 1) * HALF) * RECEPTOR_GRID.spacing,
    RECEPTOR_PLANE_Y,
    (row - (RECEPTOR_GRID.rows - 1) * HALF) * RECEPTOR_GRID.spacing,
  ];
}

export const REGION_SPECS: Readonly<Record<RegionId, RegionSpec>> = {
  head: { x: [-10, 14], y: [-11, 12], z: [-6, 6] },
  nose: { x: [0, 11], y: [-2, 7.5], z: [-3, 3] },
  tonguePatch: { x: [-20, 20], y: [-5, 15], z: [-14, 14] },
  scoop: { x: [-11, 11], y: [-1, 15], z: [-9, 9] },
  receptorGrid: { x: [-18, 18], y: [-20, 0], z: [-11, 11] },
  lineup: { x: [-26, 26], y: [2, 18], z: [-6, 6] },
};

export const ANCHOR_POINTS: Readonly<Record<AnchorId, Point>> = {
  bite: BITE_SPOT,
  smellPatch: SMELL_PATCH.centre,
  tongueBite: TONGUE_BITE.centre,
  grid: [0, RECEPTOR_PLANE_Y, 0],
};
