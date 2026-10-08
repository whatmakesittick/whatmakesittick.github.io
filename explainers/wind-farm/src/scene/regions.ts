import { Box3, Vector3 } from 'three';
import type { RegionId, SpacingD } from '../ids';
import type { GroundPoint } from '../model';
import { SUBSTATION_HEIGHT_M } from './constants';
import {
  collectorRoutes,
  FARM_TERRAIN,
  MAX_PLUME_D,
  ROTOR_DIAMETER_M,
  ROTOR_RADIUS_M,
  SUBSTATION,
  TIP_HEIGHT_M,
  TURBINE_GEOMETRY,
  farmLayout,
  terrainHeight,
  windArrowsX,
} from '../model';

type FarmRegionId = Extract<RegionId, 'farm' | 'wakes' | 'grid'>;

const [HUB_X, HUB_Y] = TURBINE_GEOMETRY.hub;
const ROTOR_REACH_M = Math.abs(HUB_X) + ROTOR_RADIUS_M;
const ROTOR_DEPTH_M = TURBINE_GEOMETRY.spinnerRadius * 2;
const CABLE_END_REACH_M = 1200;
const PLUME_VIEW_SHARE = 0.5;

function turbineRegion(): Box3 {
  return new Box3(
    new Vector3(-ROTOR_REACH_M, 0, -ROTOR_REACH_M),
    new Vector3(ROTOR_REACH_M, TIP_HEIGHT_M, ROTOR_REACH_M),
  );
}

function nacelleRegion(): Box3 {
  const { nacelle, cooler, spinnerRadius } = TURBINE_GEOMETRY;
  return new Box3(
    new Vector3(HUB_X - spinnerRadius, nacelle.minY, -nacelle.halfWidth),
    new Vector3(nacelle.maxX, cooler.topY, nacelle.halfWidth),
  );
}

function rotorRegion(): Box3 {
  return new Box3(
    new Vector3(HUB_X - ROTOR_DEPTH_M, HUB_Y - ROTOR_RADIUS_M, -ROTOR_RADIUS_M),
    new Vector3(HUB_X + ROTOR_DEPTH_M, HUB_Y + ROTOR_RADIUS_M, ROTOR_RADIUS_M),
  );
}

function turbinesRegion(spacing: SpacingD): Box3 {
  const box = new Box3();
  farmLayout(spacing).forEach(({ x, z }) => {
    const ground = terrainHeight(x, z);
    box.expandByPoint(new Vector3(x - ROTOR_RADIUS_M, ground, z - ROTOR_RADIUS_M));
    box.expandByPoint(new Vector3(x + ROTOR_RADIUS_M, ground + TIP_HEIGHT_M, z + ROTOR_RADIUS_M));
  });
  return box;
}

function withSubstation(turbines: Box3): Box3 {
  const ground = terrainHeight(SUBSTATION.x, SUBSTATION.z);
  const halfWidth = SUBSTATION.width / 2;
  const halfDepth = SUBSTATION.depth / 2;
  return turbines
    .clone()
    .expandByPoint(new Vector3(SUBSTATION.x - halfWidth, ground, SUBSTATION.z - halfDepth))
    .expandByPoint(new Vector3(SUBSTATION.x + halfWidth, ground, SUBSTATION.z + halfDepth));
}

function wakesRegion(turbines: Box3, spacing: SpacingD): Box3 {
  const box = turbines.clone();
  box.min.x = Math.min(box.min.x, windArrowsX(spacing));
  box.max.x = Math.min(
    FARM_TERRAIN.maxX,
    box.max.x + MAX_PLUME_D * PLUME_VIEW_SHARE * ROTOR_DIAMETER_M,
  );
  return box;
}

function cableEnd(route: readonly GroundPoint[]): GroundPoint {
  const [fromX, fromZ] = route[route.length - 2];
  const dx = fromX - SUBSTATION.x;
  const dz = fromZ - SUBSTATION.z;
  const share = Math.min(1, CABLE_END_REACH_M / Math.hypot(dx, dz));
  return [SUBSTATION.x + dx * share, SUBSTATION.z + dz * share];
}

function gridRegion(spacing: SpacingD): Box3 {
  const ends = collectorRoutes(spacing).map(cableEnd);
  const halfX = Math.max(...ends.map(([x]) => Math.abs(x - SUBSTATION.x)));
  const halfZ = Math.max(...ends.map(([, z]) => Math.abs(z - SUBSTATION.z)));
  const yard = terrainHeight(SUBSTATION.x, SUBSTATION.z);
  const ground = Math.min(yard, ...ends.map(([x, z]) => terrainHeight(x, z)));
  const top = yard + SUBSTATION_HEIGHT_M;
  return new Box3(
    new Vector3(SUBSTATION.x - halfX, ground, SUBSTATION.z - halfZ),
    new Vector3(SUBSTATION.x + halfX, top, SUBSTATION.z + halfZ),
  );
}

export function farmRegions(spacing: SpacingD): Readonly<Record<FarmRegionId, Box3>> {
  const turbines = turbinesRegion(spacing);
  return {
    farm: withSubstation(turbines),
    wakes: wakesRegion(turbines, spacing),
    grid: gridRegion(spacing),
  };
}

export function buildRegions(spacing: SpacingD): Record<RegionId, Box3> {
  return {
    turbine: turbineRegion(),
    nacelle: nacelleRegion(),
    rotor: rotorRegion(),
    ...farmRegions(spacing),
  };
}

export function refreshFarmRegions(regions: Record<RegionId, Box3>, spacing: SpacingD): void {
  const next = farmRegions(spacing);
  (Object.keys(next) as FarmRegionId[]).forEach((id) => regions[id].copy(next[id]));
}
