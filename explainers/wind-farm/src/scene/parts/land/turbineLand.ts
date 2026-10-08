import { label, namedGroup } from '../context';
import type { PartContext, Section } from '../context';
import { LAND_LABELS, TREE_SHAPE, TURBINE_TREE_LIMITS, TURBINE_TREES } from './constants';
import { TURBINE_FIELDS } from './fieldConstants';
import { fieldLayout } from './fieldLayout';
import type { FieldLayout } from './fieldPlan';
import { groundTexture } from './groundTexture';
import { hardstandMesh } from './hardstand';
import { skyDome } from './sky';
import { terrainMesh } from './terrainMesh';
import { crownGeometry, trunkGeometry } from './treeGeometry';
import { placeTrees } from './treePlacement';
import type { TreeArea } from './treePlacement';
import { plantTrees } from './trees';
import { TURBINE_RULES, trackDistance, turbineLandHeight } from './turbineGround';
import { turbineTerrainGeometry } from './turbineTerrain';
import { paintTurbineGround, turbineProjection } from './turbineTexture';

export function turbineFieldLayout(): FieldLayout {
  return fieldLayout(TURBINE_FIELDS, TURBINE_RULES);
}

export function turbineTreeArea(layout: FieldLayout): TreeArea {
  const { reach, heroClear, trackClear } = TURBINE_TREE_LIMITS;
  return {
    layout,
    trees: TURBINE_TREES,
    allowed: (x, z) => {
      const distance = Math.hypot(x, z);
      return distance > heroClear && distance < reach && trackDistance(x, z) > trackClear;
    },
    height: turbineLandHeight,
  };
}

export function buildTurbineLand(context: PartContext): Section {
  const root = namedGroup('turbineLand');
  const layout = turbineFieldLayout();
  const projection = turbineProjection();
  const texture = groundTexture(context, projection, (painter) =>
    paintTurbineGround(painter, layout),
  );
  const terrain = terrainMesh(context, turbineTerrainGeometry(projection), texture, 'land');
  const spots = placeTrees(turbineTreeArea(layout));
  const { crown, trunk } = plantTrees(
    context,
    spots,
    'turbineTree',
    crownGeometry(TREE_SHAPE.crown),
    trunkGeometry(),
  );
  root.add(skyDome(context, 'turbineSky'), terrain, hardstandMesh(context), crown);
  if (trunk) root.add(trunk);
  const [x, z] = LAND_LABELS.land;
  label(context, 'land', terrain, [x, turbineLandHeight(x, z), z]);
  return { root, setState: () => undefined };
}
