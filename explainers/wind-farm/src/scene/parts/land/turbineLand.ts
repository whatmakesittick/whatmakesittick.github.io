import { label, namedGroup } from '../context';
import type { PartContext, Section } from '../context';
import { LAND_LABELS } from './constants';
import { hardstandMesh } from './hardstand';
import { terrainMesh } from './terrainMesh';
import { turbineLandHeight } from './turbineGround';
import { turbineTerrainGeometry } from './turbineTerrain';

export function buildTurbineLand(context: PartContext): Section {
  const root = namedGroup('turbineLand');
  const terrain = terrainMesh(context, turbineTerrainGeometry(), 'land');
  root.add(terrain, hardstandMesh(context));
  const [x, z] = LAND_LABELS.land;
  label(context, 'land', terrain, [x, turbineLandHeight(x, z), z]);
  return { root, setState: () => undefined };
}
