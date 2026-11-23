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
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { FINISHES } from '../../finishes';
import type { Finish } from '../../finishes';
import type { PartContext } from '../context';
import { seededRandom, shrubItems, treeItems, tuftItems } from './placement';
import type { TreeItem, TreeKind } from './placement';
import { ScrollingInstances, copiesOf, NEAR_WINDOW } from './strip';
import type { InstancePart, StripItem } from './strip';
import { groundShadowMesh, shadowMatrix, TREE_SHADOW_SHAPES } from './sceneryShadows';

interface Crown {
  readonly centreY: number;
  readonly radiusY: number;
  readonly trunkTop: number;
  readonly lump: number;
}

const CROWNS: Record<TreeKind, Crown> = {
  pine: { centreY: 0.84, radiusY: 0.15, trunkTop: 0.8, lump: 0.28 },
  round: { centreY: 0.6, radiusY: 0.4, trunkTop: 0.45, lump: 0.22 },
};

const FOLIAGE = {
  pine: { low: '#22331f', high: '#5a7040' },
  round: { low: '#263a22', high: '#647b44' },
  shrub: { low: '#33452a', high: '#7f8f50' },
  tuftBase: '#4c5e33',
  tuftTip: '#bfae6c',
} as const;

const TRUNK = { radius: 0.035, segments: 6 } as const;
const TINT_RANGE = 0.22;
const LUMP_SEED = 5;
const TUFT_BLADES = 5;
const TUFT_LEAN = 0.35;

function crownGeometry(crown: Crown, low: string, high: string, seed: number): BufferGeometry {
  const random = seededRandom(seed);
  const geometry = mergeVertices(
    new IcosahedronGeometry(0.5, 1).deleteAttribute('normal').deleteAttribute('uv'),
  );
  const position = geometry.getAttribute('position');
  const colours = new Float32Array(position.count * 3);
  const vertex = new Vector3();
  const bottom = new Color(low);
  const top = new Color(high);
  const shade = new Color();
  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    const lift = vertex.y / 0.5;
    vertex.multiplyScalar(1 + (random() - 0.5) * crown.lump);
    vertex.y = crown.centreY + vertex.y * (crown.radiusY / 0.5);
    position.setXYZ(index, vertex.x, vertex.y, vertex.z);
    shade.copy(bottom).lerp(top, Math.min(Math.max(lift * 0.5 + 0.5, 0), 1));
    shade.toArray(colours, index * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function trunkGeometry(top: number): BufferGeometry {
  return new CylinderGeometry(TRUNK.radius * 0.7, TRUNK.radius, top, TRUNK.segments).translate(
    0,
    top / 2,
    0,
  );
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
  const trunk = plantMesh(context, trunkGeometry(crown.trunkTop), 'bark', count);
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
  const shrubCrown = { centreY: 0.45, radiusY: 0.45, trunkTop: 0, lump: 0.35 };
  const shrub = crownGeometry(shrubCrown, FOLIAGE.shrub.low, FOLIAGE.shrub.high, LUMP_SEED + 2);
  const tuft = tuftGeometry();
  const parts = [
    trees(context, 'pine', pines, LUMP_SEED),
    trees(context, 'round', rounds, LUMP_SEED + 1),
    scatter(context, shrub, 'shrub', shrubItems()),
    scatter(context, tuft, 'tuft', tuftItems()),
  ];
  return { meshes: parts.flatMap((part) => part.meshes), movers: parts.map((part) => part.mover) };
}
