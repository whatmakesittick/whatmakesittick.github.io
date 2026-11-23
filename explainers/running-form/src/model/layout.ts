import type { RegionSpec } from '@core/scene/regions';
import { toRadians } from '@core/math';
import type { RegionId } from '../ids';
import { HEIGHT_M } from './body';

export const ROAD = { zMinM: -1.8, zMaxM: 5.4, laneM: 3.6, edgeLineM: 0.12 } as const;
export const CENTRE_LINE_Z_M = 1.8;
export const WALL = { zM: -2.3, heightM: 0.9, thicknessM: 0.3 } as const;
export const SEA_START_Z_M = -6;
export const VERGE = { zMinM: 6, zMaxM: 16 } as const;
export const DELINEATOR_HEIGHT_M = 1.2;

export const NEAR_STRIP_M = 240;
export const SCROLL_WRAP_M = 2880;
export const WINDOW_BEHIND_M = 40;
export const WINDOW_AHEAD_M = 120;

export const PATTERN_PERIODS_M = {
  centreLine: 12,
  kerb: 12,
  lamp: 40,
  delineator: 60,
  treeGroupShort: 12,
  treeGroupLong: 20,
} as const;

export const CENTRE_LINE_DASH_M = 3;

export const SUN_ELEVATION_DEG = 8;
export const SUN_AZIMUTH_FROM_SEA_DEG = 30;

function sunDirection(): readonly [number, number, number] {
  const elevation = toRadians(SUN_ELEVATION_DEG);
  const azimuth = toRadians(SUN_AZIMUTH_FROM_SEA_DEG);
  const horizontal = Math.cos(elevation);
  return [-horizontal * Math.sin(azimuth), Math.sin(elevation), -horizontal * Math.cos(azimuth)];
}

export const SUN_DIR = sunDirection();

export const SHADOW_LENGTH_M = HEIGHT_M / Math.tan(toRadians(SUN_ELEVATION_DEG));

export const REGION_SPECS: Readonly<Record<RegionId, RegionSpec>> = {
  body: { x: [-0.9, 0.9], y: [0, 1.95], z: [-0.5, 0.5] },
  upperBody: { x: [-0.5, 0.5], y: [0.85, 1.9], z: [-0.45, 0.45] },
  stanceLeg: { x: [-0.65, 0.7], y: [0, 1.0], z: [-0.4, 0.4] },
  footZone: { x: [-0.55, 0.65], y: [0, 0.45], z: [-0.3, 0.3] },
  roadAhead: { x: [-1.6, 1.6], y: [0, 2.0], z: [-0.6, 0.6] },
};
