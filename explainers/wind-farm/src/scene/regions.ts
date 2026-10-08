import { Box3, Vector3 } from 'three';
import type { RegionId, SpacingD } from '../ids';
import { SUBSTATION_HEIGHT_M } from './constants';
import {
  FARM_TERRAIN,
  MAX_PLUME_D,
  ROTOR_DIAMETER_M,
  ROTOR_RADIUS_M,
  SUBSTATION,
  TIP_HEIGHT_M,
  TURBINE_GEOMETRY,
  farmLayout,
  terrainHeight,
} from '../model';

type FarmRegionId = Extract<RegionId, 'farm' | 'wakes' | 'grid'>;

const [HUB_X, HUB_Y] = TURBINE_GEOMETRY.hub;
const ROTOR_REACH_M = Math.abs(HUB_X) + ROTOR_RADIUS_M;
const ROTOR_DEPTH_M = TURBINE_GEOMETRY.spinnerRadius * 2;

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

function farmRegion(spacing: SpacingD): Box3 {
  const box = new Box3();
  farmLayout(spacing).forEach(({ x, z }) => {
    const ground = terrainHeight(x, z);
    box.expandByPoint(new Vector3(x - ROTOR_RADIUS_M, ground, z - ROTOR_RADIUS_M));
    box.expandByPoint(new Vector3(x + ROTOR_RADIUS_M, ground + TIP_HEIGHT_M, z + ROTOR_RADIUS_M));
  });
  return box;
}

function wakesRegion(farm: Box3): Box3 {
  const box = farm.clone();
  box.max.x = Math.min(FARM_TERRAIN.maxX, box.max.x + MAX_PLUME_D * ROTOR_DIAMETER_M);
  return box;
}

function gridRegion(farm: Box3): Box3 {
  const ground = terrainHeight(SUBSTATION.x, SUBSTATION.z);
  return farm
    .clone()
    .expandByPoint(
      new Vector3(SUBSTATION.x - SUBSTATION.width / 2, ground, SUBSTATION.z - SUBSTATION.depth / 2),
    )
    .expandByPoint(
      new Vector3(
        SUBSTATION.x + SUBSTATION.width / 2,
        ground + SUBSTATION_HEIGHT_M,
        SUBSTATION.z + SUBSTATION.depth / 2,
      ),
    );
}

export function farmRegions(spacing: SpacingD): Readonly<Record<FarmRegionId, Box3>> {
  const farm = farmRegion(spacing);
  return { farm, wakes: wakesRegion(farm), grid: gridRegion(farm) };
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
