import { Color, Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { BufferGeometry, InstancedMesh } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { instancedMesh } from '../context';
import type { PartContext } from '../context';
import { TREE_TINT } from './constants';
import { between, seededRandom } from './random';
import type { Random } from './random';
import type { TreeSpot } from './treePlacement';

const FULL_TURN = Math.PI * 2;
const SEED_SCALE = 2 ** 31;
const AUTUMN = new Color(...TREE_TINT.autumn);
const BARK = new Color(...TREE_TINT.trunk);

export interface Planting {
  readonly crown: InstancedMesh;
  readonly trunk?: InstancedMesh;
}

function crownTint(random: Random, out: Color): Color {
  const lightness = between(random, TREE_TINT.lightness);
  const warmth = (random() * 2 - 1) * TREE_TINT.warmth;
  out.setRGB(lightness * (1 + warmth), lightness, lightness * (1 - warmth));
  if (random() < TREE_TINT.autumnShare) out.multiply(AUTUMN);
  return out;
}

function plantMatrix(spot: TreeSpot, random: Random, out: Matrix4): Matrix4 {
  const turn = new Quaternion().setFromEuler(new Euler(0, random() * FULL_TURN, 0));
  const height = spot.scale * between(random, TREE_TINT.stretch);
  return out.compose(
    new Vector3(spot.x, spot.y, spot.z),
    turn,
    new Vector3(spot.scale, height, spot.scale),
  );
}

export function plantTrees(
  context: PartContext,
  spots: readonly TreeSpot[],
  name: string,
  crownShape: BufferGeometry,
  trunkShape?: BufferGeometry,
): Planting {
  const crown = instancedMesh(context, crownShape, STRUCTURE_GROUP, 'trees', spots.length);
  const trunk = trunkShape
    ? instancedMesh(context, trunkShape, STRUCTURE_GROUP, 'trees', spots.length)
    : undefined;
  crown.name = `${name}Crowns`;
  if (trunk) trunk.name = `${name}Trunks`;
  const matrix = new Matrix4();
  const tint = new Color();
  spots.forEach((spot, index) => {
    const random = seededRandom(Math.floor(spot.seed * SEED_SCALE));
    plantMatrix(spot, random, matrix);
    crown.setMatrixAt(index, matrix);
    crown.setColorAt(index, crownTint(random, tint));
    trunk?.setMatrixAt(index, matrix);
    trunk?.setColorAt(index, BARK);
  });
  [crown, trunk].forEach((mesh) => mesh?.computeBoundingSphere());
  return { crown, trunk };
}
