import { terrainHeight } from '../../../model/layout';
import { label, namedGroup } from '../context';
import type { PartContext, Section } from '../context';
import { LAND_LABELS } from './constants';
import { farmKeepOut } from './farmKeepOut';
import { farmTerrainGeometry } from './farmTerrain';
import { terrainMesh } from './terrainMesh';

export function buildFarmLand(context: PartContext): Section {
  const root = namedGroup('farmLand');
  const terrain = terrainMesh(context, farmTerrainGeometry(farmKeepOut()), 'farmLand');
  root.add(terrain);
  const [x, z] = LAND_LABELS.farmLand;
  label(context, 'farmLand', terrain, [x, terrainHeight(x, z), z]);
  return { root, setState: () => undefined };
}
