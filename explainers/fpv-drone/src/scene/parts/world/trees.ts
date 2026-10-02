import { ConeGeometry, CylinderGeometry, Group } from 'three';
import type { BufferGeometry } from 'three';
import { lerp } from '@core/math';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { TREES } from '../../constants';
import { WORLD_FINISHES } from '../../finishes';
import { hash2 } from '../../geometry/noise';
import { rod } from '../../geometry/rods';
import type { Vec3 } from '../../geometry/rods';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';

export interface TreeSpot {
  x: number;
  z: number;
  height: number;
  poplar: boolean;
  turn: number;
}

const SEEDS = { jitterX: 1, jitterZ: 2, kind: 3, height: 4, turn: 5 } as const;

export function treeSpots(): TreeSpot[] {
  const spots: TreeSpot[] = [];
  TREES.rows.forEach((row, rowIndex) => {
    const [from, to] = TREES.line.x;
    for (let x = from + row.offset, index = 0; x <= to; x += row.spacing, index += 1) {
      const seed = TREES.seed + rowIndex * 100;
      const poplar = hash2(index, seed + SEEDS.kind) < TREES.poplarShare;
      const range = poplar ? TREES.poplar.height : TREES.conifer.height;
      spots.push({
        x: x + (hash2(index, seed + SEEDS.jitterX) - 0.5) * row.jitter * 2,
        z: TREES.line.z + row.z + (hash2(index, seed + SEEDS.jitterZ) - 0.5) * row.jitter * 2,
        height: lerp(range[0], range[1], hash2(index, seed + SEEDS.height)),
        poplar,
        turn: hash2(index, seed + SEEDS.turn) * Math.PI * 2,
      });
    }
  });
  return spots;
}

function coniferGeometry(spot: TreeSpot): { crown: BufferGeometry; trunk: BufferGeometry } {
  const { tiers, radius, overlap, segments, trunk } = TREES.conifer;
  const trunkHeight = spot.height * trunk.share;
  const crownHeight = spot.height - trunkHeight;
  const tierHeight = crownHeight / (tiers - (tiers - 1) * overlap);
  const crowns: BufferGeometry[] = [];
  for (let tier = 0; tier < tiers; tier += 1) {
    const share = 1 - tier / tiers;
    const base = trunkHeight + tier * tierHeight * (1 - overlap);
    const cone = new ConeGeometry(spot.height * radius * share, tierHeight, segments);
    cone.translate(0, base + tierHeight / 2, 0);
    cone.rotateY(spot.turn);
    cone.translate(spot.x, 0, spot.z);
    crowns.push(cone);
  }
  const stem = new CylinderGeometry(trunk.radius * 0.7, trunk.radius, trunkHeight * 1.4, 6);
  stem.translate(spot.x, trunkHeight * 0.7, spot.z);
  return { crown: mergeParts(crowns), trunk: stem };
}

function poplarGeometry(spot: TreeSpot): BufferGeometry {
  const { trunk, branches } = TREES.poplar;
  const stem = new CylinderGeometry(trunk.radius[0], trunk.radius[1], spot.height, trunk.segments);
  stem.translate(spot.x, spot.height / 2, spot.z);
  const limbs = Array.from({ length: branches.count }, (_, index) => {
    const share = branches.from + ((1 - branches.from) * index) / branches.count;
    const angle = spot.turn + (index * Math.PI * 2) / branches.count;
    const base: Vec3 = [spot.x, spot.height * share, spot.z];
    const length = spot.height * branches.length * (1 - share * 0.5);
    const tip: Vec3 = [
      spot.x + Math.cos(angle) * Math.sin(branches.spread) * length,
      spot.height * share + Math.cos(branches.spread) * length,
      spot.z + Math.sin(angle) * Math.sin(branches.spread) * length,
    ];
    return rod(base, tip, branches.radius, 5, branches.radius * 0.4);
  });
  return mergeParts([stem, ...limbs]);
}

export function createTreeline(context: PartContext): Group {
  const crowns: BufferGeometry[] = [];
  const trunks: BufferGeometry[] = [];
  const poplars: BufferGeometry[] = [];
  for (const spot of treeSpots()) {
    if (spot.poplar) {
      poplars.push(poplarGeometry(spot));
      continue;
    }
    const conifer = coniferGeometry(spot);
    crowns.push(conifer.crown);
    trunks.push(conifer.trunk);
  }
  const group = new Group();
  group.add(
    partMesh(context, mergeParts(crowns), UNDIMMED_GROUP, WORLD_FINISHES.conifer),
    partMesh(context, mergeParts(trunks), UNDIMMED_GROUP, WORLD_FINISHES.trunk),
    partMesh(context, mergeParts(poplars), UNDIMMED_GROUP, WORLD_FINISHES.poplar),
  );
  return group;
}
