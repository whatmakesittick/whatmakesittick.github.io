import { Color } from 'three';
import type { InstancedMesh } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { PartContext } from '../../context';
import { between, pick, seededRandom } from '../random';
import type { Range } from '../random';
import { periodicCopies } from './copies';
import { instanced } from './instances';
import type { Instance } from './instances';
import { treeGeometry } from './treeGeometry';
import type { Detail } from './treeGeometry';
import { TREE_ROWS } from './constants';
import type { TreeKind, TreeSpot } from './treePlacement';

const SEED_SCALE = 2 ** 31;
const FULL_TURN = Math.PI * 2;
const STRETCH: Range = [0.9, 1.15];
const LIGHTNESS: Range = [0.88, 1.1];

export const TREE_FINISH: MaterialFinish = {
  color: '#ffffff',
  vertexColors: true,
  roughness: 0.92,
  metalness: 0,
};

export const TREE_TINTS: Readonly<Record<TreeKind, readonly string[]>> = {
  round: ['#4e6a36', '#5b783d', '#445f32', '#68824a', '#55703a'],
  conifer: ['#4a6235', '#536d39', '#5d723c', '#7d6b3f'],
};

function treeInstance(spot: TreeSpot): Instance {
  const random = seededRandom(Math.floor(spot.seed * SEED_SCALE));
  const height = spot.scale * between(random, STRETCH);
  const colour = new Color(pick(random, TREE_TINTS[spot.kind])).multiplyScalar(
    between(random, LIGHTNESS),
  );
  return {
    position: [spot.x, 0, spot.z],
    turn: random() * FULL_TURN,
    scale: [spot.scale, height, spot.scale],
    colour,
  };
}

const DETAILS = ['near', 'far'] as const;
const KINDS = ['round', 'conifer'] as const;

function detailOf(spot: TreeSpot): Detail {
  return Math.abs(spot.z) < TREE_ROWS.near ? 'near' : 'far';
}

export function plantTrees(
  context: PartContext,
  spots: readonly TreeSpot[],
  period: number,
  reach: number,
  name: string,
): InstancedMesh[] {
  const copies = periodicCopies(spots, period, reach);
  return KINDS.flatMap((kind) =>
    DETAILS.map((detail) =>
      instanced(
        context,
        treeGeometry(kind, detail),
        TREE_FINISH,
        copies.filter((spot) => spot.kind === kind && detailOf(spot) === detail).map(treeInstance),
        `${name}-${kind}-${detail}`,
      ),
    ),
  );
}
