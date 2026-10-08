import type { SpacingD } from '../../../ids';
import type { PartContext } from '../context';
import { ROAD, ROAD_FINISH } from './constants';
import { midpoint, onGround } from './ground';
import { ribbons, SpacingLayer } from './layer';
import type { LayerShape } from './layer';
import { farmRoutes, padRoutes } from './routes';
import { Widening } from './widening';

const PART = 'accessRoads';
const LABEL_ROW = 2;
const LABEL_SITE = 1;

function roadShape(spacing: SpacingD): LayerShape {
  const routes = farmRoutes(spacing);
  const geometry = ribbons([
    { routes, options: ROAD },
    { routes: padRoutes(spacing), options: { ...ROAD, width: ROAD.padWidth } },
  ]);
  const row = routes[LABEL_ROW];
  return { geometry, label: onGround(midpoint(row[LABEL_SITE], row[LABEL_SITE + 1]), ROAD.lift) };
}

export function accessRoads(context: PartContext): SpacingLayer {
  const widening = new Widening(context, PART, ROAD_FINISH, {
    halfWidth: ROAD.width / 2,
    perMetre: ROAD.widenPerMetre,
  });
  return new SpacingLayer(context, PART, widening, roadShape);
}
