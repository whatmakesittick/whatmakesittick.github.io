import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedMesh,
  Vector3,
} from 'three';
import type { Material } from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { FINISHES } from '../../finishes';
import type { Finish } from '../../finishes';
import type { PartContext } from '../context';
import { seededRandom, shrubItems, treeItems, tuftItems } from './placement';
import type { TreeItem, TreeKind } from './placement';
import { ScrollingInstances, copiesOf, NEAR_WINDOW } from './strip';
import type { InstancePart, StripItem } from './strip';
import { groundShadowMesh, shadowMatrix, TREE_SHADOW_SHAPES } from './sceneryShadows';

interface Clump {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radius: number;
  readonly squash: number;
}

interface Crown {
  readonly clumps: readonly Clump[];
  readonly trunkTop: number;
  readonly lean: number;
}

const CROWNS: Record<TreeKind, Crown> = {
  pine: {
    trunkTop: 0.82,
    lean: 0.06,
    clumps: [
      { x: 0, y: 0.88, z: 0, radius: 0.3, squash: 0.42 },
      { x: 0.24, y: 0.85, z: 0.08, radius: 0.22, squash: 0.5 },
      { x: -0.22, y: 0.84, z: -0.1, radius: 0.24, squash: 0.48 },
      { x: 0.04, y: 0.86, z: 0.26, radius: 0.2, squash: 0.5 },
      { x: -0.06, y: 0.9, z: -0.25, radius: 0.2, squash: 0.5 },
    ],
  },
  round: {
    trunkTop: 0.48,
    lean: 0.02,
    clumps: [
      { x: 0, y: 0.68, z: 0, radius: 0.34, squash: 0.85 },
      { x: 0.2, y: 0.55, z: 0.1, radius: 0.24, squash: 0.85 },
      { x: -0.2, y: 0.57, z: -0.08, radius: 0.25, squash: 0.85 },
      { x: 0.05, y: 0.56, z: -0.22, radius: 0.22, squash: 0.85 },
      { x: -0.04, y: 0.85, z: 0.12, radius: 0.22, squash: 0.85 },
    ],
  },
};

const SHRUB_CROWN: Crown = {
  trunkTop: 0,
  lean: 0,
  clumps: [
    { x: 0, y: 0.45, z: 0, radius: 0.5, squash: 0.8 },
    { x: 0.35, y: 0.3, z: 0.15, radius: 0.32, squash: 0.85 },
    { x: -0.3, y: 0.32, z: -0.2, radius: 0.34, squash: 0.85 },
  ],
};

const FOLIAGE = {
  pine: { low: '#1d2c1b', high: '#55693a' },
  round: { low: '#22341f', high: '#5f7540' },
  shrub: { low: '#2c3d24', high: '#76864a' },
  tuftBase: '#4c5e33',
  tuftTip: '#bfae6c',
} as const;

const TRUNK = { radius: 0.03, segments: 6 } as const;
const TINT_RANGE = 0.22;
const LUMP_SEED = 5;
const TUFT_BLADES = 5;
const TUFT_LEAN = 0.35;
const CLUMP_DETAIL = { main: 1, side: 0 } as const;
const LUMP = 0.3;

function clumpGeometry(
  clump: Clump,
  detail: number,
  random: () => number,
  low: Color,
  high: Color,
): BufferGeometry {
  const geometry = mergeVertices(
    new IcosahedronGeometry(1, detail).deleteAttribute('normal').deleteAttribute('uv'),
  );
  const position = geometry.getAttribute('position');
  const colours = new Float32Array(position.count * 3);
  const vertex = new Vector3();
  const shade = new Color();
  const tint = 0.85 + random() * 0.3;
  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    const lift = vertex.y;
    vertex.multiplyScalar(clump.radius * (1 + (random() - 0.5) * LUMP));
    vertex.y *= clump.squash;
    vertex.add(new Vector3(clump.x, clump.y, clump.z));
    position.setXYZ(index, vertex.x, vertex.y, vertex.z);
    const height = Math.min(Math.max(lift * 0.5 + 0.5, 0), 1);
    shade
      .copy(low)
      .lerp(high, height * height)
      .multiplyScalar(tint);
    shade.toArray(colours, index * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function crownGeometry(crown: Crown, low: string, high: string, seed: number): BufferGeometry {
  const random = seededRandom(seed);
  const parts = crown.clumps.map((clump, index) =>
    clumpGeometry(
      clump,
      index === 0 ? CLUMP_DETAIL.main : CLUMP_DETAIL.side,
      random,
      new Color(low),
      new Color(high),
    ),
  );
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return merged;
}

function trunkGeometry(crown: Crown): BufferGeometry {
  const top = crown.trunkTop;
  return new CylinderGeometry(TRUNK.radius * 0.65, TRUNK.radius, top, TRUNK.segments)
    .translate(0, top / 2, 0)
    .rotateZ(-crown.lean);
}

function tuftGeometry(): BufferGeometry {
  const positions: number[] = [];
  const colours: number[] = [];
  const base = new Color(FOLIAGE.tuftBase);
  const tip = new Color(FOLIAGE.tuftTip);
  for (let blade = 0; blade < TUFT_BLADES; blade += 1) {
    const angle = (blade / TUFT_BLADES) * Math.PI * 2;
    const side = new Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(0.08);
    const lean = new Vector3(Math.sin(angle), 0, -Math.cos(angle)).multiplyScalar(TUFT_LEAN);
    positions.push(-side.x, 0, -side.z, side.x, 0, side.z, lean.x, 1, lean.z);
    colours.push(...base.toArray(), ...base.toArray(), ...tip.toArray());
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function plantMesh(
  context: PartContext,
  geometry: BufferGeometry,
  finish: Finish,
  count: number,
): InstancedMesh {
  const material: Material = context.materials.get(UNDIMMED_GROUP, FINISHES[finish]);
  return new InstancedMesh(context.tracker.track(geometry), material, count);
}

function tint(mesh: InstancedMesh, items: readonly { tint: number }[], copies: number): void {
  const colour = new Color();
  items.forEach((item, index) => {
    const value = 1 - TINT_RANGE / 2 + item.tint * TINT_RANGE;
    colour.setRGB(value, value * (0.97 + item.tint * 0.06), value * 0.95);
    for (let copy = 0; copy < copies; copy += 1) mesh.setColorAt(index * copies + copy, colour);
  });
}

function trees(context: PartContext, kind: TreeKind, items: readonly TreeItem[], seed: number) {
  const copies = copiesOf(NEAR_WINDOW);
  const count = items.length * copies;
  const crown = CROWNS[kind];
  const palette = FOLIAGE[kind];
  const canopy = plantMesh(
    context,
    crownGeometry(crown, palette.low, palette.high, seed),
    'foliage',
    count,
  );
  const trunk = plantMesh(context, trunkGeometry(crown), 'bark', count);
  const shadow = groundShadowMesh(context, TREE_SHADOW_SHAPES[kind], count);
  tint(canopy, items, copies);
  const parts: InstancePart[] = [
    { mesh: canopy },
    { mesh: trunk },
    { mesh: shadow, matrixFor: shadowMatrix },
  ];
  return { meshes: [shadow, trunk, canopy], mover: new ScrollingInstances(parts, items) };
}

function scatter(
  context: PartContext,
  geometry: BufferGeometry,
  finish: Finish,
  items: readonly StripItem[],
) {
  const mesh = plantMesh(context, geometry, finish, items.length * copiesOf(NEAR_WINDOW));
  return { meshes: [mesh], mover: new ScrollingInstances([{ mesh }], items) };
}

export function buildPlants(context: PartContext): {
  meshes: InstancedMesh[];
  movers: ScrollingInstances[];
} {
  const all = treeItems();
  const pines = all.filter((item) => item.kind === 'pine');
  const rounds = all.filter((item) => item.kind === 'round');
  const shrub = crownGeometry(SHRUB_CROWN, FOLIAGE.shrub.low, FOLIAGE.shrub.high, LUMP_SEED + 2);
  const tuft = tuftGeometry();
  const parts = [
    trees(context, 'pine', pines, LUMP_SEED),
    trees(context, 'round', rounds, LUMP_SEED + 1),
    scatter(context, shrub, 'shrub', shrubItems()),
    scatter(context, tuft, 'tuft', tuftItems()),
  ];
  return { meshes: parts.flatMap((part) => part.meshes), movers: parts.map((part) => part.mover) };
}
