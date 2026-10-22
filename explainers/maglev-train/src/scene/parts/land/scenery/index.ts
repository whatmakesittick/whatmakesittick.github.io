import type { Group } from 'three';
import { wrapOffset } from '../../../pose';
import { namedGroup } from '../../context';
import type { PartContext } from '../../context';
import { GROUND, SCENERY } from '../constants';
import { landBlocks } from '../ground/blocks';
import type { GroundPlan } from '../ground/texture';
import { periodicCopies } from './copies';
import { buildDistant } from './distant';
import { TUNNEL, buildGreenhouses, tunnels } from './greenhouses';
import { buildHouses } from './houses';
import { boxCaster, houseCaster, shadowDecals, treeCaster } from './shadows';
import type { ShadowCaster } from './shadows';
import { tileTrees } from './treePlacement';
import type { TreeSpot } from './treePlacement';
import { plantTrees, treeHeightScale } from './trees';
import { tileVillages } from './villagePlacement';
import type { VillagePlan } from './villagePlacement';

export interface Scenery {
  readonly root: Group;
  slide(distance: number): void;
}

interface Streaming {
  readonly group: Group;
  readonly period: number;
}

function treeCasters(spots: readonly TreeSpot[], period: number): ShadowCaster[] {
  return periodicCopies(spots, period, SCENERY.treeReach).map((spot) =>
    treeCaster(spot, treeHeightScale(spot)),
  );
}

function farmTile(context: PartContext, plan: GroundPlan, group: Group): void {
  const { period } = GROUND;
  const trees = tileTrees(plan.linears, plan.fields, landBlocks(plan.linears));
  const tunnelCasters = periodicCopies(tunnels(plan.fields), period, SCENERY.reach).map((tunnel) =>
    boxCaster(tunnel.x, tunnel.z, tunnel.width, tunnel.length, TUNNEL.height),
  );
  group.add(
    ...plantTrees(context, trees, period, SCENERY.treeReach, 'row'),
    buildGreenhouses(context, plan.fields, period, SCENERY.reach),
    shadowDecals(context, [...treeCasters(trees, period), ...tunnelCasters], 'farmShadows'),
  );
}

function villages(context: PartContext, village: VillagePlan, group: Group): void {
  const period = SCENERY.villagePeriod;
  const houseCasters = periodicCopies(village.houses, period, SCENERY.reach).map(houseCaster);
  group.add(
    ...buildHouses(context, village, period, SCENERY.reach),
    ...plantTrees(context, village.trees, period, SCENERY.treeReach, 'village'),
    shadowDecals(
      context,
      [...houseCasters, ...treeCasters(village.trees, period)],
      'villageShadows',
    ),
  );
}

export function buildScenery(context: PartContext, plan: GroundPlan): Scenery {
  const root = namedGroup('scenery');
  const streams: Streaming[] = [
    { group: namedGroup('farmTile', root), period: GROUND.period },
    { group: namedGroup('villages', root), period: SCENERY.villagePeriod },
    { group: namedGroup('distant', root), period: SCENERY.distantPeriod },
  ];
  const [tile, village, distant] = streams.map(({ group }) => group);
  farmTile(context, plan, tile);
  villages(context, tileVillages(landBlocks(plan.linears), plan.fields), village);
  distant.add(buildDistant(context));
  return {
    root,
    slide(distance) {
      streams.forEach(({ group, period }) => (group.position.x = wrapOffset(distance, period)));
    },
  };
}
