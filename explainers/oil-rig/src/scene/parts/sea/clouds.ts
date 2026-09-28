import { CircleGeometry, SphereGeometry } from 'three';
import type { BufferGeometry, Mesh } from 'three';
import { lerp } from '@core/math';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { CLOUDS } from '../../constants';
import { merge, mergePainted } from '../../geometry/merge';
import { seededRandom } from '../../geometry/random';
import { partMesh } from '../context';
import type { PartContext } from '../context';

const FULL_TURN = Math.PI * 2;
const QUARTER_TURN = Math.PI / 2;
const PUFF_SPREAD = 0.42;
const PUFF_LIFT = 0.22;
const PUFF_MIN = 0.35;

function puff(radius: number): BufferGeometry {
  const dome = new SphereGeometry(
    radius,
    CLOUDS.widthSegments,
    CLOUDS.heightSegments,
    0,
    FULL_TURN,
    0,
    QUARTER_TURN,
  );
  const base = new CircleGeometry(radius, CLOUDS.widthSegments);
  base.rotateX(QUARTER_TURN);
  return mergePainted([
    [dome, CLOUDS.top],
    [base, CLOUDS.bottom],
  ]);
}

function cloud(random: () => number): BufferGeometry {
  const width = lerp(CLOUDS.width[0], CLOUDS.width[1], random());
  const puffs = Array.from({ length: CLOUDS.puffs }, (_, index) => {
    const share = index / (CLOUDS.puffs - 1) - 1 / 2;
    const radius = (width / CLOUDS.puffs) * (1 + (PUFF_MIN + random()) * (1 - Math.abs(share)));
    const geometry = puff(radius);
    geometry.translate(
      share * width,
      random() * radius * PUFF_LIFT,
      (random() - 1 / 2) * width * PUFF_SPREAD,
    );
    return geometry;
  });
  const merged = merge(puffs);
  merged.scale(1, CLOUDS.squash, 1);
  const angle = random() * FULL_TURN;
  const distance = lerp(CLOUDS.distance[0], CLOUDS.distance[1], random());
  merged.rotateY(-angle);
  merged.translate(
    distance * Math.cos(angle),
    lerp(CLOUDS.height[0], CLOUDS.height[1], random()),
    distance * Math.sin(angle),
  );
  return merged;
}

export function createClouds(context: PartContext): Mesh {
  const random = seededRandom(CLOUDS.seed);
  const clouds = Array.from({ length: CLOUDS.count }, () => cloud(random));
  const mesh = partMesh(context, merge(clouds), UNDIMMED_GROUP, 'cloud');
  mesh.frustumCulled = false;
  return mesh;
}
