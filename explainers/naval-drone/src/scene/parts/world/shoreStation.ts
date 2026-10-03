import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Matrix4,
  Object3D,
  SphereGeometry,
  Vector3,
} from 'three';
import type { Texture } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { GROUND_STATION } from '../../../model/layout';
import { THEME } from '../../../theme';
import type { PartId } from '../../../ids';
import { instanced, mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';
import { canvasTexture } from '../surfaces';

type Spot = readonly [x: number, z: number];
type Size = readonly [width: number, height: number, depth: number];
type Radome = readonly [x: number, diameter: number, plinth: number];
type Cabinet = readonly [x: number, z: number, ...size: Size];

export interface StationPart {
  object: Group;
  anchor: Object3D;
}

const GROUP: PartId = 'groundStation';
const PAD: Size = [20, 0.39, 13];
const PAD_TOP = 0.14;
const RADOME_Z = -1.6;
const RADOMES: readonly Radome[] = [
  [-6, 2.7, 1.05],
  [0, 3.5, 1.3],
  [5.6, 2.2, 0.9],
];
const DOME_CUT = 0.45;
const DOME_SEGMENTS = [32, 12] as const;
const PLINTH = [0.62, 1.08, 0.14] as const;
const SEGMENTS = 24;
const CABINETS: readonly Cabinet[] = [
  [-8, 4.9, 1.8, 1.9, 0.7],
  [-3, 5, 1.4, 1.35, 0.8],
  [8.2, 4.5, 1.9, 1.35, 1.1],
];
const TRAY_Z = 3;
const TRAY_LIFT = 0.45;
const TRAY_SIZE = [0.32, 0.08] as const;
const TRAY_X = [-8.6, 8.2] as const;
const LIGHTS: readonly Spot[] = [
  [-12.2, 8.2],
  [12.2, -8.2],
  [-12.2, -8.2],
];
const LIGHT = [4.2, 0.06] as const;
const FENCE: readonly Spot[] = [
  [4, 9],
  [-13, 9],
  [-13, -9],
  [13, -9],
  [13, 9],
  [8, 9],
];
const FENCE_HEIGHT = 2.4;
const FENCE_LOW = 0.06;
const FENCE_TILE = 0.3;
const POST_SPACING = 3;
const POST = [0.035, 6, 1.6] as const;
const PLINTH_COLOUR = '#b1afa7';
const RING_COLOUR = '#5d6266';
const CABINET_COLOUR = '#c3c7c9';
const TRAY_COLOUR = '#a2a7aa';
const LIGHT_COLOUR = '#585e63';
const MAP_SIZE = 256;
const DIAMONDS = 5;
const WIRE = 2.5;
const ANCHOR_LIFT = 1.6;

const PAD_FINISH = { color: THEME.concrete, roughness: 0.92, envMapIntensity: 0.4 } as const;
const BODY_FINISH: MaterialFinish = { vertexColors: true, roughness: 0.7, metalness: 0.1 };
const RADOME_FINISH: MaterialFinish = { color: THEME.radome, roughness: 0.5, envMapIntensity: 0.8 };
const POST_COLOUR = '#a9aeb1';
const POST_FINISH: MaterialFinish = { color: POST_COLOUR, roughness: 0.45, metalness: 0.6 };
const MESH_FINISH = {
  alphaTest: 0.02,
  opacity: 0.8,
  transparent: true,
  depthWrite: false,
  side: DoubleSide,
};

const RGB = 3;
const XYZ = 3;
const UV = 2;
const PAIR = 2;

export function shaded(geometry: BufferGeometry, low: string, high = low): BufferGeometry {
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox!;
  const position = geometry.getAttribute('position');
  const colours = new Float32Array(position.count * RGB);
  const colour = new Color();
  const top = new Color(high);
  for (let index = 0; index < position.count; index += 1) {
    colour.set(low).lerp(top, (position.getY(index) - min.y) / (max.y - min.y));
    colour.toArray(colours, index * RGB);
  }
  return geometry.setAttribute('color', new BufferAttribute(colours, RGB));
}

function cuboid(x: number, z: number, [width, height, depth]: Size, floor: number): BufferGeometry {
  return new BoxGeometry(width, height, depth).translate(x, floor + height / 2, z);
}

function column(x: number, z: number, radius: number, from: number, to: number, flare = 1) {
  return new CylinderGeometry(radius, radius * flare, to - from, SEGMENTS).translate(
    x,
    (from + to) / 2,
    z,
  );
}

function domeCentre([x, diameter, plinth]: Radome): Vector3 {
  return new Vector3(x, PAD_TOP + plinth + (DOME_CUT * diameter) / 2, RADOME_Z);
}

function dome(radome: Radome): BufferGeometry {
  const { x, y, z } = domeCentre(radome);
  const [around, rows] = DOME_SEGMENTS;
  const sphere = new SphereGeometry(
    radome[1] / 2,
    around,
    rows,
    0,
    Math.PI * 2,
    0,
    Math.acos(-DOME_CUT),
  );
  return sphere.translate(x, y, z);
}

function plinth([x, diameter, height]: Radome): BufferGeometry[] {
  const [share, flare, band] = PLINTH;
  const radius = diameter / 2;
  const top = PAD_TOP + height;
  const ring = radius * Math.sqrt(1 - DOME_CUT ** 2);
  return [
    shaded(column(x, RADOME_Z, radius * share, PAD_TOP, top, flare), PLINTH_COLOUR),
    shaded(column(x, RADOME_Z, ring, top - band / 2, top + band / 2), RING_COLOUR),
  ];
}

function trays(): BufferGeometry[] {
  const [width, depth] = TRAY_SIZE;
  const floor = PAD_TOP + TRAY_LIFT;
  const branch = ([x]: Radome) =>
    cuboid(x, (TRAY_Z + RADOME_Z) / 2, [width, depth, TRAY_Z - RADOME_Z], floor);
  const length = TRAY_X[1] - TRAY_X[0];
  return [
    cuboid((TRAY_X[0] + TRAY_X[1]) / 2, TRAY_Z, [length, depth, width], floor),
    ...RADOMES.map(branch),
  ];
}

function bodyGeometry(): BufferGeometry {
  const [height, radius] = LIGHT;
  const lights = LIGHTS.map(([x, z]) => column(x, z, radius, 0, height));
  return mergeParts([
    ...RADOMES.flatMap(plinth),
    ...CABINETS.map(([x, z, ...size]) => shaded(cuboid(x, z, size, PAD_TOP), CABINET_COLOUR)),
    ...trays().map((part) => shaded(part, TRAY_COLOUR)),
    ...lights.map((part) => shaded(part, LIGHT_COLOUR)),
  ]);
}

function fenceStrip(path: readonly Spot[]): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  let along = 0;
  path.forEach(([x, z], point) => {
    if (point > 0) {
      along += Math.hypot(x - path[point - 1][0], z - path[point - 1][1]);
      const corner = point * PAIR;
      index.push(corner - PAIR, corner, corner - 1, corner - 1, corner, corner + 1);
    }
    positions.push(x, FENCE_LOW, z, x, FENCE_HEIGHT, z);
    uvs.push(
      along / FENCE_TILE,
      FENCE_LOW / FENCE_TILE,
      along / FENCE_TILE,
      FENCE_HEIGHT / FENCE_TILE,
    );
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), XYZ));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), UV));
  geometry.setIndex(index).computeVertexNormals();
  return geometry;
}

function posts(): Matrix4[] {
  const [, , thick] = POST;
  const post = ([x, z]: Spot, width = 1) =>
    new Matrix4().makeScale(width, 1, width).setPosition(x, 0, z);
  const along = FENCE.slice(1).flatMap(([x, z], point) => {
    const [px, pz] = FENCE[point];
    const steps = Math.ceil(Math.hypot(x - px, z - pz) / POST_SPACING);
    return Array.from({ length: steps }, (_, step) =>
      post([px + ((x - px) * step) / steps, pz + ((z - pz) * step) / steps], step ? 1 : thick),
    );
  });
  return [...along, post(FENCE[FENCE.length - 1], thick)];
}

function meshTexture(): Texture {
  const step = MAP_SIZE / DIAMONDS;
  return canvasTexture(
    MAP_SIZE,
    MAP_SIZE,
    (pen, _width, height) => {
      pen.strokeStyle = POST_COLOUR;
      pen.lineWidth = WIRE;
      for (let line = -DIAMONDS; line <= DIAMONDS + DIAMONDS; line += 1) {
        pen.moveTo(line * step - height, height);
        pen.lineTo(line * step, 0);
        pen.lineTo(line * step + height, height);
      }
      pen.stroke();
    },
    true,
  );
}

export function createStation(context: PartContext, grain: Texture): StationPart {
  const { tracker } = context;
  const [radius, sides] = POST;
  const post = new CylinderGeometry(radius, radius, FENCE_HEIGHT, sides).translate(
    0,
    FENCE_HEIGHT / 2,
    0,
  );
  const object = new Group();
  object.position.set(...GROUND_STATION);
  object.add(
    partMesh(context, cuboid(0, 0, PAD, PAD_TOP - PAD[1]), GROUP, {
      ...PAD_FINISH,
      map: grain,
    }),
    partMesh(context, bodyGeometry(), GROUP, BODY_FINISH),
    partMesh(context, mergeParts(RADOMES.map(dome)), GROUP, RADOME_FINISH),
    instanced(context, post, GROUP, POST_FINISH, posts()),
    partMesh(context, fenceStrip(FENCE), GROUP, {
      ...POST_FINISH,
      ...MESH_FINISH,
      map: tracker.track(meshTexture()),
    }),
  );
  const middle = RADOMES[1];
  const anchor = new Object3D();
  anchor.position.copy(domeCentre(middle)).add(object.position);
  anchor.position.y += middle[1] / 2 + ANCHOR_LIFT;
  return { object, anchor };
}
