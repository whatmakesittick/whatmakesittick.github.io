import { BoxGeometry, Color } from 'three';
import type { InstancedMesh } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { PartContext } from '../../context';
import { SCENERY } from '../constants';
import { between, pick, seededRandom } from '../random';
import type { Random } from '../random';
import { DISTANT } from './constants';
import { periodicCopies } from './copies';
import { instanced } from './instances';

export interface Block3 {
  readonly x: number;
  readonly z: number;
  readonly length: number;
  readonly depth: number;
  readonly height: number;
  readonly turn: number;
  readonly tint: string;
}

const DISTANT_FINISH: MaterialFinish = { color: '#ffffff', roughness: 0.9, metalness: 0 };
const SLAB_TINTS = ['#e3ded4', '#d8d5ce', '#cfd3d6', '#e8e1d2'];
const SHED_TINTS = ['#b9c2c9', '#c9c6bd', '#a9b6c0'];
const TURN_JITTER = 0.08;

function building(x: number, z: number, random: Random): Block3 {
  const slab = random() < DISTANT.slabShare;
  const shape = slab ? DISTANT.slab : DISTANT.shed;
  return {
    x,
    z,
    length: between(random, shape.length),
    depth: between(random, shape.depth),
    height: between(random, shape.height),
    turn: (random() * 2 - 1) * TURN_JITTER,
    tint: pick(random, slab ? SLAB_TINTS : SHED_TINTS),
  };
}

export function distantBuildings(): Block3[] {
  const random = seededRandom(DISTANT.seed);
  return Array.from({ length: DISTANT.clusters }, (_, index) => {
    const side = index % 2 === 0 ? 1 : -1;
    const centreX = random() * SCENERY.distantPeriod;
    const centreZ = side * between(random, DISTANT.zRange);
    const spread = between(random, DISTANT.spread);
    const count = Math.round(between(random, DISTANT.perCluster));
    return Array.from({ length: count }, () =>
      building(
        centreX + (random() - 0.5) * spread * 2,
        centreZ + (random() - 0.5) * spread,
        random,
      ),
    );
  }).flat();
}

export function buildDistant(context: PartContext): InstancedMesh {
  const geometry = new BoxGeometry(1, 1, 1);
  geometry.translate(0, 0.5, 0);
  geometry.deleteAttribute('uv');
  const copies = periodicCopies(distantBuildings(), SCENERY.distantPeriod, SCENERY.reach);
  return instanced(
    context,
    geometry,
    DISTANT_FINISH,
    copies.map((block) => ({
      position: [block.x, 0, block.z],
      turn: block.turn,
      scale: [block.length, block.height, block.depth],
      colour: new Color(block.tint),
    })),
    'distantBuildings',
  );
}
