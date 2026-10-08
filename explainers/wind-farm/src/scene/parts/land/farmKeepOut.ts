import { SPACING_OPTIONS } from '../../../ids';
import { GRID_LINE_END, SUBSTATION, collectorRoutes, farmLayout } from '../../../model/layout';
import type { GroundPoint } from '../../../model/layout';
import { FARM_TREE_LIMITS } from './constants';
import type { KeepOut } from './keepOut';

const SUBSTATION_POINT: GroundPoint = [SUBSTATION.x, SUBSTATION.z];

export function farmKeepOut(): KeepOut {
  const { siteClear, routeClear, substationClear, gridClear } = FARM_TREE_LIMITS;
  const sites = SPACING_OPTIONS.flatMap((spacing) => farmLayout(spacing));
  const routes = SPACING_OPTIONS.flatMap((spacing) => collectorRoutes(spacing));
  return {
    discs: [
      ...sites.map(({ x, z }) => ({ centre: [x, z] as GroundPoint, radius: siteClear })),
      { centre: SUBSTATION_POINT, radius: substationClear },
    ],
    corridors: [
      ...routes.map((points) => ({ points, radius: routeClear })),
      { points: [SUBSTATION_POINT, [GRID_LINE_END.x, GRID_LINE_END.z]], radius: gridClear },
    ],
  };
}
