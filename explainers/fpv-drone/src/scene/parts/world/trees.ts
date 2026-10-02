import { BufferAttribute, Color, ConeGeometry, CylinderGeometry, Group } from 'three';
import type { BufferGeometry } from 'three';
import { lerp } from '@core/math';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { TREES } from '../../constants';
import { WORLD_FINISHES } from '../../finishes';
import { hash2 } from '../../geometry/noise';
import { along, rod } from '../../geometry/rods';
import type { Vec3 } from '../../geometry/rods';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';

export interface TreeSpot {
  x: number;
  z: number;
  height: number;
  poplar: boolean;
  turn: number;
  girth: number;
  tone: number;
}

const SEEDS = { jitterX: 1, jitterZ: 2, kind: 3, height: 4, turn: 5, girth: 6, tone: 7 } as const;
const RGB = 3;
const ROW_SEED_STEP = 100;
const TRUNK_SINK = 1.4;
const TWIG_SIDES = [1, -1] as const;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const LIMB_SHORTENING = 0.5;
const LIMB_TAPER = 0.35;
const TWIG_TAPER = 0.4;
const TRUNK_TOP_SHARE = 0.7;
const GREENS = TREES.conifer.greens.map((colour) => new Color(colour));

export function treeSpots(): TreeSpot[] {
  const spots: TreeSpot[] = [];
  TREES.rows.forEach((row, rowIndex) => {
    const [from, to] = TREES.line.x;
    const seed = TREES.seed + rowIndex * ROW_SEED_STEP;
    for (let x = from + row.offset, index = 0; x <= to; x += row.spacing, index += 1) {
      const random = (key: number) => hash2(index, seed + key);
      const poplar = random(SEEDS.kind) < TREES.poplarShare;
      const range = poplar ? TREES.poplar.height : TREES.conifer.height;
      spots.push({
        x: x + (random(SEEDS.jitterX) - 0.5) * row.jitter * 2,
        z: TREES.line.z + row.z + (random(SEEDS.jitterZ) - 0.5) * row.jitter * 2,
        height: lerp(range[0], range[1], random(SEEDS.height)),
        poplar,
        turn: random(SEEDS.turn) * Math.PI * 2,
        girth: random(SEEDS.girth),
        tone: random(SEEDS.tone),
      });
    }
  });
  return spots;
}

export function coniferGreen(tone: number): Color {
  return GREENS[Math.min(GREENS.length - 1, Math.floor(tone * GREENS.length))];
}

function paintCrown(geometry: BufferGeometry, spot: TreeSpot): BufferGeometry {
  const { shade } = TREES.conifer;
  const position = geometry.getAttribute('position');
  const colours = new Float32Array(position.count * RGB);
  const green = coniferGreen(spot.tone);
  const tint = new Color();
  for (let index = 0; index < position.count; index += 1) {
    const share = position.getY(index) / spot.height;
    tint.copy(green).multiplyScalar(lerp(shade.base, shade.tip, share));
    tint.toArray(colours, index * RGB);
  }
  geometry.setAttribute('color', new BufferAttribute(colours, RGB));
  return geometry;
}

function coniferGeometry(spot: TreeSpot): { crown: BufferGeometry; trunk: BufferGeometry } {
  const { tiers, radius, overlap, segments, trunk } = TREES.conifer;
  const trunkHeight = spot.height * trunk.share;
  const crownHeight = spot.height - trunkHeight;
  const tierHeight = crownHeight / (tiers - (tiers - 1) * overlap);
  const width = spot.height * lerp(radius[0], radius[1], spot.girth);
  const crowns: BufferGeometry[] = [];
  for (let tier = 0; tier < tiers; tier += 1) {
    const share = 1 - tier / tiers;
    const base = trunkHeight + tier * tierHeight * (1 - overlap);
    const cone = new ConeGeometry(width * share, tierHeight, segments);
    cone.translate(0, base + tierHeight / 2, 0);
    cone.rotateY(spot.turn);
    crowns.push(cone);
  }
  const crown = paintCrown(mergeParts(crowns), spot);
  crown.translate(spot.x, 0, spot.z);
  const stem = new CylinderGeometry(
    trunk.radius * TRUNK_TOP_SHARE,
    trunk.radius,
    trunkHeight * TRUNK_SINK,
    6,
  );
  stem.translate(spot.x, (trunkHeight * TRUNK_SINK) / 2, spot.z);
  return { crown, trunk: stem };
}

function limbDirection(angle: number, spread: number): Vec3 {
  return [Math.cos(angle) * Math.sin(spread), Math.cos(spread), Math.sin(angle) * Math.sin(spread)];
}

export function poplarGeometry(spot: TreeSpot): BufferGeometry {
  const { trunk, branches, twigs } = TREES.poplar;
  const stem = new CylinderGeometry(trunk.radius[0], trunk.radius[1], spot.height, trunk.segments);
  stem.translate(spot.x, spot.height / 2, spot.z);
  const limbs: BufferGeometry[] = [];
  for (let index = 0; index < branches.count; index += 1) {
    const share = branches.from + ((1 - branches.from) * index) / branches.count;
    const angle = spot.turn + index * GOLDEN_ANGLE;
    const spread = lerp(branches.spread[0], branches.spread[1], hash2(index, spot.turn));
    const base: Vec3 = [spot.x, spot.height * share, spot.z];
    const length = spot.height * branches.length * (1 - share * LIMB_SHORTENING);
    const direction = limbDirection(angle, spread);
    limbs.push(
      rod(
        base,
        along(base, direction, length),
        branches.radius,
        branches.segments,
        branches.radius * LIMB_TAPER,
      ),
    );
    const fork = along(base, direction, length * twigs.at);
    for (const side of TWIG_SIDES.slice(0, twigs.perBranch)) {
      const twig = limbDirection(angle + side * twigs.fork, spread + twigs.fork / 2);
      limbs.push(
        rod(
          fork,
          along(fork, twig, length * twigs.length),
          twigs.radius,
          branches.segments - 1,
          twigs.radius * TWIG_TAPER,
        ),
      );
    }
  }
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
