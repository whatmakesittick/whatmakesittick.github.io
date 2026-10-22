import { BoxGeometry, CylinderGeometry, Float32BufferAttribute, Group, Mesh } from 'three';
import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { MaterialFinish } from '@core/scene/materials';
import { LINE_DRAW } from '../../constants';
import { lineX } from '../../pose';
import { LINE_GROUP } from '../context';
import type { PartContext } from '../context';
import { featherGeometry, featherShadowMaterial } from './feather';
import { FaceBuilder } from './scenery/faceBuilder';
import { prismShadow } from './shadow';
import type { Rgb } from './scenery/faceBuilder';
import { SUBSTATION, substationLines } from './substationPlan';

type Box = readonly [
  x: number,
  y: number,
  z: number,
  length: number,
  height: number,
  depth: number,
];

const COLOURS = {
  gravel: [0.5, 0.49, 0.46],
  concrete: [0.74, 0.72, 0.68],
  wall: [0.86, 0.85, 0.82],
  glass: [0.2, 0.25, 0.3],
  steel: [0.55, 0.58, 0.6],
  transformer: [0.36, 0.42, 0.38],
  porcelain: [0.62, 0.48, 0.38],
} as const satisfies Record<string, Rgb>;

const FINISH: MaterialFinish = {
  color: '#ffffff',
  vertexColors: true,
  roughness: 0.8,
  metalness: 0.1,
};
const YARD_LIFT = 0.05;
const FENCE = { height: 2.2, plinth: 0.45, post: 0.12, spacing: 3, panel: 0.05 } as const;
const HALL: Box = [-11, 0, 4.5, 16, 5.6, 9];
const HALL_WINDOWS = { count: 5, inset: 1.4, pitch: 3, width: 1.8, sill: 2.4, top: 3.8 } as const;
const ROOF_RIM = { height: 0.5, overhang: 0.3 } as const;
const FACE_OUT = 0.03;
const TRANSFORMERS = [-2, 6.5, 15] as const;
const TRANSFORMER = { length: 4.2, height: 3, depth: 3.2, z: -6, bushing: 1.6 } as const;
const GANTRY = { height: 11, z: -6, span: 26, post: 0.35 } as const;
const BUSHING_SIDES = 6;
const SHADOW = { feather: 1.2, lift: 0.1, colour: '#1f2633', opacity: 0.5 } as const;
const HALF = 0.5;

function painted(geometry: BufferGeometry, colour: Rgb): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (flat !== geometry) geometry.dispose();
  flat.deleteAttribute('uv');
  const count = flat.getAttribute('position').count;
  const colours = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) colours.set(colour, index * 3);
  flat.setAttribute('color', new Float32BufferAttribute(colours, 3));
  return flat;
}

function block([x, y, z, length, height, depth]: Box, colour: Rgb): BufferGeometry {
  const geometry = new BoxGeometry(length, height, depth);
  geometry.translate(x, y + height * HALF, z);
  return painted(geometry, colour);
}

function fence(): BufferGeometry[] {
  const { length, depth } = SUBSTATION;
  const parts: BufferGeometry[] = [];
  const sides: Box[] = [
    [0, 0, depth / 2, length, FENCE.plinth, FENCE.panel * 4],
    [0, 0, -depth / 2, length, FENCE.plinth, FENCE.panel * 4],
    [length / 2, 0, 0, FENCE.panel * 4, FENCE.plinth, depth],
    [-length / 2, 0, 0, FENCE.panel * 4, FENCE.plinth, depth],
  ];
  sides.forEach((side) => parts.push(block(side, COLOURS.concrete)));
  for (let x = -length / 2; x <= length / 2; x += FENCE.spacing)
    [-1, 1].forEach((side) =>
      parts.push(
        block([x, 0, (side * depth) / 2, FENCE.post, FENCE.height, FENCE.post], COLOURS.steel),
      ),
    );
  for (let z = -depth / 2 + FENCE.spacing; z < depth / 2; z += FENCE.spacing)
    [-1, 1].forEach((side) =>
      parts.push(
        block([(side * length) / 2, 0, z, FENCE.post, FENCE.height, FENCE.post], COLOURS.steel),
      ),
    );
  return parts;
}

function hall(): BufferGeometry[] {
  const [x, , z, length, height, depth] = HALL;
  const windows = new FaceBuilder();
  const front = z + depth / 2 + FACE_OUT;
  const { count, inset, pitch, width, sill, top } = HALL_WINDOWS;
  for (let index = 0; index < count; index += 1) {
    const left = x - length / 2 + inset + index * pitch;
    windows.quad(
      [left, sill, front],
      [left + width, sill, front],
      [left + width, top, front],
      [left, top, front],
      COLOURS.glass,
    );
  }
  return [
    block(HALL, COLOURS.wall),
    block(
      [x, height, z, length + ROOF_RIM.overhang, ROOF_RIM.height, depth + ROOF_RIM.overhang],
      COLOURS.concrete,
    ),
    windows.geometry(),
  ];
}

function transformer(x: number): BufferGeometry[] {
  const { length, height, depth, z, bushing } = TRANSFORMER;
  const parts = [
    block([x, 0, z, length + 1, 0.4, depth + 1], COLOURS.concrete),
    block([x, 0.4, z, length, height, depth], COLOURS.transformer),
    block([x, 0.6, z + depth / 2 + 0.3, length * 0.9, height * 0.8, 0.5], COLOURS.transformer),
  ];
  [-1, 0, 1].forEach((offset) => {
    const geometry = new CylinderGeometry(0.12, 0.18, bushing, BUSHING_SIDES);
    geometry.translate(x + offset * length * 0.3, 0.4 + height + bushing / 2, z);
    parts.push(painted(geometry, COLOURS.porcelain));
  });
  return parts;
}

function gantry(): BufferGeometry[] {
  const { height, z, span, post } = GANTRY;
  return [
    block([-span / 2, 0, z, post, height, post], COLOURS.steel),
    block([span / 2, 0, z, post, height, post], COLOURS.steel),
    block([0, height - 0.6, z, span + post, 0.6, post * 1.4], COLOURS.steel),
  ];
}

function yard(): BufferGeometry {
  const { length, depth } = SUBSTATION;
  return block([0, YARD_LIFT - 0.04, 0, length, 0.04, depth], COLOURS.gravel);
}

export function substationGeometry(): BufferGeometry {
  const parts = [yard(), ...fence(), ...hall(), ...TRANSFORMERS.flatMap(transformer), ...gantry()];
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return merged;
}

function shadowGeometry(): BufferGeometry {
  const [x, , z, length, height, depth] = HALL;
  const casters = [
    prismShadow({
      x: [x - length / 2, x + length / 2],
      y: [0, height + ROOF_RIM.height],
      z: [z - depth / 2, z + depth / 2],
    }),
    ...TRANSFORMERS.map((at) =>
      prismShadow({
        x: [at - TRANSFORMER.length / 2, at + TRANSFORMER.length / 2],
        y: [0, TRANSFORMER.height],
        z: [TRANSFORMER.z - TRANSFORMER.depth / 2, TRANSFORMER.z + TRANSFORMER.depth / 2],
      }),
    ),
  ];
  const parts = casters.map((outline) => featherGeometry(outline, SHADOW.feather, SHADOW.lift));
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return merged;
}

export interface Substations {
  readonly root: Group;
  setState(distance: number): void;
}

function isInWindow(x: number): boolean {
  const half = SUBSTATION.length / 2;
  return x + half > -LINE_DRAW.behind && x - half < LINE_DRAW.ahead;
}

export function buildSubstations(context: PartContext): Substations {
  const root = new Group();
  root.name = 'substations';
  const geometry = context.tracker.track(substationGeometry());
  const material = context.materials.get(LINE_GROUP, FINISH);
  const shadow = context.tracker.track(shadowGeometry());
  const shade = featherShadowMaterial(context, SHADOW);
  const lines = substationLines();
  const meshes = lines.map(() => {
    const mesh = new Mesh(geometry, material);
    mesh.name = 'substation';
    mesh.position.z = SUBSTATION.centreZ;
    const cast = new Mesh(shadow, shade);
    cast.renderOrder = 1;
    mesh.add(cast);
    root.add(mesh);
    return mesh;
  });
  return {
    root,
    setState(distance) {
      meshes.forEach((mesh, index) => {
        mesh.position.x = lineX(lines[index], distance);
        mesh.visible = isInWindow(mesh.position.x);
      });
    },
  };
}
