import type { Group } from 'three';
import { wrapOffset } from '../../../pose';
import { namedGroup } from '../../context';
import type { PartContext } from '../../context';
import { GROUND, SCENERY } from '../constants';
import { landBlocks } from '../ground/blocks';
import type { GroundPlan } from '../ground/texture';
import { buildGreenhouses } from './greenhouses';
import { buildHouses } from './houses';
import { tileTrees } from './treePlacement';
import { plantTrees } from './trees';
import { tileVillages } from './villagePlacement';

export interface Scenery {
  readonly root: Group;
  slide(distance: number): void;
}

interface Streaming {
  readonly group: Group;
  readonly period: number;
}

export function buildScenery(context: PartContext, plan: GroundPlan): Scenery {
  const root = namedGroup('scenery');
  const blocks = landBlocks(plan.linears);
  const tile: Streaming = { group: namedGroup('farmTile', root), period: GROUND.period };
  const villages: Streaming = {
    group: namedGroup('villages', root),
    period: SCENERY.villagePeriod,
  };
  tile.group.add(
    ...plantTrees(
      context,
      tileTrees(plan.linears, plan.fields, blocks),
      tile.period,
      SCENERY.reach,
      'row',
    ),
    buildGreenhouses(context, plan.fields, tile.period, SCENERY.reach),
  );
  const village = tileVillages(blocks, plan.fields);
  villages.group.add(
    ...buildHouses(context, village, villages.period, SCENERY.reach),
    ...plantTrees(context, village.trees, villages.period, SCENERY.treeReach, 'village'),
  );
  const streams = [tile, villages];
  return {
    root,
    slide(distance) {
      streams.forEach(({ group, period }) => (group.position.x = wrapOffset(distance, period)));
    },
  };
}
