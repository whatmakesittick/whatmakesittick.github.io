import type { FarmSite, Point, RowIndex, SpacingD } from '../ids';
import { ACROSS_SPACING_D, HUB_HEIGHT_M, ROTOR_DIAMETER_M, TIP_HEIGHT_M } from './constants';

export type GroundPoint = readonly [x: number, z: number];

const HILL_HEIGHT_M = 18;
const HILL_WAVE_X_M = 900;
const HILL_PHASE = 0.6;
const HILL_WAVE_Z_M = 1300;
const RIPPLE_HEIGHT_M = 9;
const RIPPLE_WAVE_M = 520;

export function terrainHeight(x: number, z: number): number {
  return (
    HILL_HEIGHT_M * Math.sin(x / HILL_WAVE_X_M + HILL_PHASE) * Math.cos(z / HILL_WAVE_Z_M) +
    RIPPLE_HEIGHT_M * Math.sin((x + z) / RIPPLE_WAVE_M)
  );
}

export const ROW_COUNT = 3;
export const COLUMN_COUNT = 9;
const MIDDLE_ROW = 1;
const MIDDLE_COLUMN = 4;
const STAGGER_M = 150;

export const HERO_SITE = MIDDLE_COLUMN;

export function farmLayout(spacing: SpacingD): readonly FarmSite[] {
  const rowStep = spacing * ROTOR_DIAMETER_M;
  const columnStep = ACROSS_SPACING_D * ROTOR_DIAMETER_M;
  return Array.from({ length: ROW_COUNT * COLUMN_COUNT }, (_, index) => {
    const row = Math.floor(index / COLUMN_COUNT) as RowIndex;
    const column = index % COLUMN_COUNT;
    const stagger = row === MIDDLE_ROW ? STAGGER_M : -STAGGER_M;
    return {
      row,
      column,
      x: (row - MIDDLE_ROW) * rowStep,
      z: (column - MIDDLE_COLUMN) * columnStep + stagger,
    };
  });
}

export const SUBSTATION = { x: 2200, z: 3000, width: 120, depth: 80 } as const;
export const GRID_LINE_END = { x: 6000, z: 3000 } as const;
export const PYLON_SPACING_M = 400;
export const FARM_TERRAIN = { minX: -4000, maxX: 6000, minZ: -5000, maxZ: 5000 } as const;

export function collectorRoutes(spacing: SpacingD): readonly (readonly GroundPoint[])[] {
  const sites = farmLayout(spacing);
  return Array.from({ length: ROW_COUNT }, (_, row) => {
    const rowSites = sites.filter((site) => site.row === row).sort((a, b) => a.z - b.z);
    const route: GroundPoint[] = rowSites.map((site) => [site.x, site.z]);
    route.push([SUBSTATION.x, SUBSTATION.z]);
    return route;
  });
}

const WIND_ARROW_OFFSET_M = 600;
const SHEAR_OFFSET_M = 400;

export function windArrowsX(spacing: SpacingD): number {
  return -spacing * ROTOR_DIAMETER_M - WIND_ARROW_OFFSET_M;
}

export function shearProfileAt(spacing: SpacingD): GroundPoint {
  return [-spacing * ROTOR_DIAMETER_M - SHEAR_OFFSET_M, -STAGGER_M];
}

export const SHEAR_HEIGHTS_M = [30, 55, 80, HUB_HEIGHT_M, 130, 155, TIP_HEIGHT_M] as const;

export const TURBINE_LAND = { radius: 3000, flatRadius: 60, blendRadius: 200 } as const;

export const TURBINE_GEOMETRY = {
  towerBaseDiameter: 4.5,
  towerTopDiameter: 3.0,
  towerTopY: 103.3,
  nacelle: { minX: -4.4, maxX: 8.4, minY: 103.3, maxY: 106.7, halfWidth: 2.1 },
  cooler: { minX: 4.0, maxX: 8.4, topY: 110.2 },
  shaftY: HUB_HEIGHT_M,
  hub: [-7.0, HUB_HEIGHT_M, 0] as Point,
  spinnerRadius: 1.9,
  bladeRootRadius: 1.3,
  mainBearing: { x: -3.6, radius: 1.2 },
  mainShaft: { minX: -4.4, maxX: -1.0, radius: 0.6 },
  gearbox: { minX: -1.0, maxX: 2.4, radius: 1.4 },
  brakeDisc: { x: 2.6, radius: 0.9 },
  generator: { minX: 3.2, maxX: 5.6, radius: 0.9 },
  converter: { minX: 6.0, maxX: 8.0, wallZ: -2.1 },
  bedplate: { minX: -4.4, maxX: 2.4, y: 103.5 },
  yawDrives: { y: 103.3, radius: 1.9 },
  transformer: { centre: [8, 0, 8] as Point, size: [3, 2.5, 3] as Point },
  foundationRadius: 5,
} as const;
