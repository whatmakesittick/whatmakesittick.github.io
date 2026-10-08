import { terrainHeight } from '../../../model/layout';
import { label, namedGroup } from '../context';
import type { PartContext, Section } from '../context';
import { FARM_TREE_LIMITS, FARM_TREES, LAND_LABELS, TREE_SHAPE } from './constants';
import { FARM_FIELDS } from './fieldConstants';
import { fieldLayout } from './fieldLayout';
import type { FieldLayout } from './fieldPlan';
import { farmKeepOut } from './farmKeepOut';
import { farmEdgeDistance, farmRules, farmTerrainGeometry } from './farmTerrain';
import { farmProjection, paintFarmGround } from './farmTexture';
import { groundTexture } from './groundTexture';
import { isClear } from './keepOut';
import type { KeepOut } from './keepOut';
import { skyDome } from './sky';
import { terrainMesh } from './terrainMesh';
import { crownGeometry } from './treeGeometry';
import { placeTrees } from './treePlacement';
import type { TreeArea } from './treePlacement';
import { plantTrees } from './trees';

export function farmFieldLayout(keepOut: KeepOut): FieldLayout {
  return fieldLayout(FARM_FIELDS, farmRules(keepOut));
}

export function farmTreeArea(layout: FieldLayout, keepOut: KeepOut): TreeArea {
  return {
    layout,
    trees: FARM_TREES,
    allowed: (x, z) =>
      farmEdgeDistance(x, z) > FARM_TREE_LIMITS.edgeMargin && isClear(keepOut, x, z),
    height: terrainHeight,
  };
}

export function buildFarmLand(context: PartContext): Section {
  const root = namedGroup('farmLand');
  const keepOut = farmKeepOut();
  const layout = farmFieldLayout(keepOut);
  const projection = farmProjection();
  const texture = groundTexture(context, projection, (painter) => paintFarmGround(painter, layout));
  const terrain = terrainMesh(context, farmTerrainGeometry(projection), texture, 'farmLand');
  const spots = placeTrees(farmTreeArea(layout, keepOut));
  const { crown } = plantTrees(context, spots, 'farmTreeClump', crownGeometry(TREE_SHAPE.clump));
  root.add(skyDome(context, 'farmSky'), terrain, crown);
  const [x, z] = LAND_LABELS.farmLand;
  label(context, 'farmLand', terrain, [x, terrainHeight(x, z), z]);
  return { root, setState: () => undefined };
}
