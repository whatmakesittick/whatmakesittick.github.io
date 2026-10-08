import { label, namedGroup } from '../context';
import type { PartContext, Section } from '../context';
import {
  LAND_LABELS,
  TREE_SHAPE,
  TURBINE_PATCHWORK,
  TURBINE_TREE_LIMITS,
  TURBINE_TREES,
} from './constants';
import { hardstandMesh } from './hardstand';
import type { Random } from './random';
import { terrainMesh } from './terrainMesh';
import { crownGeometry, trunkGeometry } from './treeGeometry';
import { placeTrees } from './treePlacement';
import type { TreeArea } from './treePlacement';
import { plantTrees } from './trees';
import { TURBINE_RULES, trackDistance, turbineLandHeight } from './turbineGround';
import { turbineTerrainGeometry } from './turbineTerrain';

const FULL_TURN = Math.PI * 2;

function pointInReach(random: Random): [number, number] {
  const radius = TURBINE_TREE_LIMITS.reach * Math.sqrt(random());
  const angle = random() * FULL_TURN;
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}

export const TURBINE_TREE_AREA: TreeArea = {
  layout: TURBINE_PATCHWORK,
  rules: TURBINE_RULES,
  trees: TURBINE_TREES,
  point: pointInReach,
  allowed: (x, z) =>
    Math.hypot(x, z) > TURBINE_TREE_LIMITS.heroClear &&
    trackDistance(x, z) > TURBINE_TREE_LIMITS.trackClear,
  height: turbineLandHeight,
};

export function buildTurbineLand(context: PartContext): Section {
  const root = namedGroup('turbineLand');
  const terrain = terrainMesh(context, turbineTerrainGeometry(), 'land');
  const spots = placeTrees(TURBINE_TREE_AREA);
  const { crown, trunk } = plantTrees(
    context,
    spots,
    'turbineTree',
    crownGeometry(TREE_SHAPE.crown),
    trunkGeometry(),
  );
  root.add(terrain, hardstandMesh(context), crown);
  if (trunk) root.add(trunk);
  const [x, z] = LAND_LABELS.land;
  label(context, 'land', terrain, [x, turbineLandHeight(x, z), z]);
  return { root, setState: () => undefined };
}
