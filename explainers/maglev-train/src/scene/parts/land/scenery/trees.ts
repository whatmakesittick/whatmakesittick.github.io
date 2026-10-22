import type { InstancedMesh } from 'three';
import { FULL_TURN } from '@core/math';
import type { PartContext } from '../../context';
import { between, pick, spotRandom } from '../random';
import type { Range } from '../random';
import { periodicCopies } from './copies';
import { instanced, tinted, vertexFinish } from './instances';
import type { Instance } from './instances';
import { TREE_KINDS, treeGeometry } from './treeGeometry';
import type { Detail } from './treeGeometry';
import { TREE_ROWS } from './constants';
import type { TreeKind, TreeSpot } from './treePlacement';

export const TREE_STRETCH: Range = [0.9, 1.15];
const LIGHTNESS: Range = [0.88, 1.1];

export const TREE_FINISH = vertexFinish(0.92);

export const TREE_TINTS: Readonly<Record<TreeKind, readonly string[]>> = {
  round: ['#4e6a36', '#5b783d', '#445f32', '#68824a', '#55703a'],
  poplar: ['#5f7b3c', '#6b8442', '#56713a', '#7a8a45'],
  conifer: ['#4a6235', '#536d39', '#5d723c', '#4f6838', '#6c6c3e'],
};

export function treeHeightScale(spot: TreeSpot): number {
  return spot.scale * between(spotRandom(spot.seed), TREE_STRETCH);
}

function treeInstance(spot: TreeSpot): Instance {
  const random = spotRandom(spot.seed);
  const height = spot.scale * between(random, TREE_STRETCH);
  const colour = tinted(pick(random, TREE_TINTS[spot.kind]), random, LIGHTNESS);
  return {
    position: [spot.x, 0, spot.z],
    turn: random() * FULL_TURN,
    scale: [spot.scale, height, spot.scale],
    colour,
  };
}

const DETAILS = ['near', 'far'] as const;

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
  return TREE_KINDS.flatMap((kind) =>
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
