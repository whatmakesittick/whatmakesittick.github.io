import type { SpacingD } from '../../../ids';
import { SUBSTATION, TURBINE_GEOMETRY, collectorRoutes, farmLayout } from '../../../model';
import type { GroundPoint } from '../../../model';
import { ROAD, ROUTE } from './constants';

const TOWER_RADIUS = TURBINE_GEOMETRY.towerBaseDiameter / 2;

export function yardEntry([fromX, fromZ]: GroundPoint): GroundPoint {
  const dx = fromX - SUBSTATION.x;
  const dz = fromZ - SUBSTATION.z;
  const reach = Math.min(
    SUBSTATION.width / 2 / Math.max(Math.abs(dx), Number.EPSILON),
    SUBSTATION.depth / 2 / Math.max(Math.abs(dz), Number.EPSILON),
  );
  return [SUBSTATION.x + dx * reach, SUBSTATION.z + dz * reach];
}

export function farmRoutes(spacing: SpacingD): GroundPoint[][] {
  return collectorRoutes(spacing).map((route) => {
    const beside = route.slice(0, -1).map(([x, z]): GroundPoint => [x + ROUTE.offset, z]);
    return [...beside, yardEntry(beside[beside.length - 1])];
  });
}

export function feederRoutes(spacing: SpacingD): GroundPoint[][] {
  return farmLayout(spacing).map(({ x, z }) => [
    [x + TOWER_RADIUS + ROUTE.towerClearance, z],
    [x + ROUTE.offset, z],
  ]);
}

export function padRoutes(spacing: SpacingD): GroundPoint[][] {
  return farmLayout(spacing).map(({ x, z }) => [
    [x - ROAD.padBehind, z],
    [x + ROUTE.offset, z],
  ]);
}
