import { lerp } from '@core/math';
import { FARM_TERRAIN, terrainHeight } from '../../../model/layout';
import { label, namedGroup } from '../context';
import type { PartContext, Section } from '../context';
import { FARM_PATCHWORK, FARM_TREE_LIMITS, FARM_TREES, LAND_LABELS, TREE_SHAPE } from './constants';
import { farmKeepOut } from './farmKeepOut';
import { farmRules, farmTerrainGeometry } from './farmTerrain';
import { isClear } from './keepOut';
import type { KeepOut } from './keepOut';
import type { Random } from './random';
import { terrainMesh } from './terrainMesh';
import { crownGeometry } from './treeGeometry';
import { placeTrees } from './treePlacement';
import type { TreeArea } from './treePlacement';
import { plantTrees } from './trees';

function pointInsideMargin(random: Random): [number, number] {
  const { minX, maxX, minZ, maxZ } = FARM_TERRAIN;
  const margin = FARM_TREE_LIMITS.edgeMargin;
  return [
    lerp(minX + margin, maxX - margin, random()),
    lerp(minZ + margin, maxZ - margin, random()),
  ];
}

export function farmTreeArea(keepOut: KeepOut): TreeArea {
  return {
    layout: FARM_PATCHWORK,
    rules: farmRules(keepOut),
    trees: FARM_TREES,
    point: pointInsideMargin,
    allowed: (x, z) => isClear(keepOut, x, z),
    height: terrainHeight,
  };
}

export function buildFarmLand(context: PartContext): Section {
  const root = namedGroup('farmLand');
  const keepOut = farmKeepOut();
  const terrain = terrainMesh(context, farmTerrainGeometry(keepOut), 'farmLand');
  const spots = placeTrees(farmTreeArea(keepOut));
  const { crown } = plantTrees(context, spots, 'farmTreeClump', crownGeometry(TREE_SHAPE.clump));
  root.add(terrain, crown);
  const [x, z] = LAND_LABELS.farmLand;
  label(context, 'farmLand', terrain, [x, terrainHeight(x, z), z]);
  return { root, setState: () => undefined };
}
