import { Group } from 'three';
import type { Object3D } from 'three';
import { terrainGrid } from '../../geometry/shoreGrid';
import type { PartContext } from '../context';
import { createGroundCover } from './shoreCover';
import { createGround } from './shoreGround';
import { grainTexture } from './shoreMaps';
import { createSlipway } from './shoreSlipway';
import { createStation } from './shoreStation';

export interface ShorePart {
  object: Group;
  stationAnchor: Object3D;
}

export function createShore(context: PartContext): ShorePart {
  const grid = terrainGrid();
  const grain = context.tracker.track(grainTexture());
  const station = createStation(context, { grain });
  const object = new Group();
  object.name = 'shore';
  object.add(
    createGround(context, grid, grain),
    ...createGroundCover(context, grid),
    createSlipway(context),
    station.object,
    station.anchor,
  );
  return { object, stationAnchor: station.anchor };
}
