import {
  BoxGeometry,
  BufferAttribute,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Object3D,
  SphereGeometry,
  Vector3,
} from 'three';
import type { BufferGeometry, Texture } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { box } from '@core/scene/geometry/box';
import type { BoxBounds } from '@core/scene/geometry/box';
import { GROUND_STATION } from '../../../model/layout';
import { THEME } from '../../../theme';
import type { PartId } from '../../../ids';
import { instanced, mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';
import { fencePanels, fencePost, fencePostMatrices, fenceRails } from './shoreFence';
import { PAD_MAP, meshTexture, padTexture, radomeTexture } from './shoreMaps';

type Spot = readonly [x: number, z: number];

interface Radome {
  x: number;
  diameter: number;
  plinth: number;
}

interface Cabinet {
  at: Spot;
  size: readonly [width: number, height: number, depth: number];
  colour: string;
}

export interface StationPart {
  object: Group;
  anchor: Object3D;
}

interface StationMaps {
  grain: Texture;
}

const GROUP: PartId = 'groundStation';

export const STATION_LAYOUT = {
  pad: { half: [10, 6.5] as Spot, top: 0.14, base: -0.25 },
  radomeZ: -1.6,
  radomes: [
    { x: -6, diameter: 2.7, plinth: 1.05 },
    { x: 0, diameter: 3.5, plinth: 1.3 },
    { x: 5.6, diameter: 2.2, plinth: 0.9 },
  ] as readonly Radome[],
  dome: { cut: 0.45, around: 32, rows: 12, ringHeight: 0.14, ringFlare: 1.04 },
  plinth: { radius: 0.62, flare: 1.08, segments: 24, door: [0.5, 0.8, 0.04] as const },
  cabinets: [
    { at: [-8.4, 4.9], size: [0.9, 1.9, 0.7], colour: '#c8ccce' },
    { at: [-7.35, 4.9], size: [0.9, 1.9, 0.7], colour: '#c2c7ca' },
    { at: [-3, 5], size: [1.4, 1.35, 0.8], colour: '#b6bbbe' },
    { at: [2.4, 5.1], size: [0.8, 1.15, 0.6], colour: '#cdd0d0' },
    { at: [8.2, 4.5], size: [1.9, 1.35, 1.1], colour: '#8d9387' },
  ] as readonly Cabinet[],
  cabinetCap: { overhang: 0.05, height: 0.05, colour: '#9ea3a6' },
  cabinetBase: { height: 0.1, inset: 0.04, colour: '#4c5054' },
  tray: { z: 3, height: 0.45, width: 0.32, depth: 0.08, x: [-8.6, 8.2] as const },
  trayColour: '#a2a7aa',
  traySupport: { spacing: 2.2, size: 0.05, colour: '#80868a' },
  lights: {
    spots: [
      [-12.2, 8.2],
      [12.2, -8.2],
      [-12.2, -8.2],
    ] as readonly Spot[],
    height: 4.2,
    radius: 0.06,
    taper: 0.7,
    segments: 8,
    head: [0.55, 0.12, 0.26] as const,
    reach: 0.4,
    colour: '#585e63',
    headColour: '#3a3e42',
  },
  railColour: '#a7acaf',
  plinthColour: '#b1afa7',
  ringColour: '#5d6266',
  doorColour: '#6f757a',
  anchorLift: 1.6,
  grainTile: 1.6,
} as const;

const PAD_FINISH = { roughness: 0.92, metalness: 0, envMapIntensity: 0.4 } as const;
const BODY_FINISH = { roughness: 0.7, metalness: 0.1, envMapIntensity: 0.6 } as const;
const RADOME_FINISH = { roughness: 0.5, metalness: 0, envMapIntensity: 0.8 } as const;
const MESH_FINISH = {
  alphaTest: 0.02,
  opacity: 0.8,
  transparent: true,
  depthWrite: false,
  side: DoubleSide,
} as const;

const POST_FINISH: MaterialFinish = {
  color: '#a9aeb1',
  roughness: 0.45,
  metalness: 0.6,
  envMapIntensity: 1.2,
};

const WHITE = '#ffffff';
const RGB = 3;
const UV = 2;
const PLANES = { x: [2, 1], y: [0, 2], z: [0, 1] } as const;
const AXES = ['x', 'y', 'z'] as const;

function tinted(geometry: BufferGeometry, colour: string): BufferGeometry {
  const tint = new Color(colour);
  const count = geometry.getAttribute('position').count;
  const colours = new Float32Array(count * RGB);
  for (let index = 0; index < count; index += 1) tint.toArray(colours, index * RGB);
  geometry.setAttribute('color', new BufferAttribute(colours, RGB));
  return geometry;
}

function metricUv(geometry: BufferGeometry, tile: number): BufferGeometry {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const uvs = new Float32Array(position.count * UV);
  for (let index = 0; index < position.count; index += 1) {
    const facing = [normal.getX(index), normal.getY(index), normal.getZ(index)].map(Math.abs);
    const [u, v] = PLANES[AXES[facing.indexOf(Math.max(...facing))]];
    const point = [position.getX(index), position.getY(index), position.getZ(index)];
    uvs.set([point[u] / tile, point[v] / tile], index * UV);
  }
  geometry.setAttribute('uv', new BufferAttribute(uvs, UV));
  return geometry;
}

function part(geometry: BufferGeometry, colour: string): BufferGeometry {
  return tinted(metricUv(geometry, STATION_LAYOUT.grainTile), colour);
}

function block(bounds: BoxBounds, colour: string): BufferGeometry {
  return part(box(bounds), colour);
}

function cylinder(top: number, bottom: number, from: number, to: number, segments: number) {
  return new CylinderGeometry(top, bottom, to - from, segments).translate(0, (from + to) / 2, 0);
}

function plinthTop(radome: Radome): number {
  return STATION_LAYOUT.pad.top + radome.plinth;
}

function domeCentre(radome: Radome): Vector3 {
  const radius = radome.diameter / 2;
  const level = plinthTop(radome) + STATION_LAYOUT.dome.cut * radius;
  return new Vector3(radome.x, level, STATION_LAYOUT.radomeZ);
}

function dome(radome: Radome): BufferGeometry {
  const { cut, around, rows } = STATION_LAYOUT.dome;
  const radius = radome.diameter / 2;
  const geometry = new SphereGeometry(radius, around, rows, 0, Math.PI * 2, 0, Math.acos(-cut));
  const centre = domeCentre(radome);
  return geometry.translate(centre.x, centre.y, centre.z);
}

function plinth(radome: Radome): BufferGeometry[] {
  const { plinth: shape, dome: domeShape, pad } = STATION_LAYOUT;
  const radius = radome.diameter / 2;
  const column = radius * shape.radius;
  const ringRadius = radius * Math.sqrt(1 - domeShape.cut ** 2) * domeShape.ringFlare;
  const top = plinthTop(radome);
  const halfRing = domeShape.ringHeight / 2;
  const [doorWidth, doorHeight, doorDepth] = shape.door;
  const front = column * shape.flare;
  const door = block(
    {
      minX: -doorWidth / 2,
      maxX: doorWidth / 2,
      minY: pad.top,
      maxY: pad.top + Math.min(doorHeight, radome.plinth - domeShape.ringHeight),
      minZ: front - doorDepth,
      maxZ: front + doorDepth / 2,
    },
    STATION_LAYOUT.doorColour,
  );
  return [
    part(cylinder(column, front, pad.top, top, shape.segments), STATION_LAYOUT.plinthColour),
    part(
      cylinder(ringRadius, ringRadius, top - halfRing, top + halfRing, shape.segments),
      STATION_LAYOUT.ringColour,
    ),
    door,
  ].map((geometry) => geometry.translate(radome.x, 0, STATION_LAYOUT.radomeZ));
}

function cabinet({ at, size, colour }: Cabinet): BufferGeometry[] {
  const { cabinetCap: cap, cabinetBase: base, pad } = STATION_LAYOUT;
  const [width, height, depth] = size;
  const floor = pad.top + base.height;
  const roof = floor + height;
  const around = (grow: number, from: number, to: number): BoxBounds => ({
    minX: -width / 2 - grow,
    maxX: width / 2 + grow,
    minY: from,
    maxY: to,
    minZ: -depth / 2 - grow,
    maxZ: depth / 2 + grow,
  });
  return [
    block(around(-base.inset, pad.top, floor), base.colour),
    block(around(0, floor, roof), colour),
    block(around(cap.overhang, roof, roof + cap.height), cap.colour),
  ].map((geometry) => geometry.translate(at[0], 0, at[1]));
}

function trayRun(x: readonly [number, number], z: readonly [number, number]): BufferGeometry {
  const { tray, pad, trayColour } = STATION_LAYOUT;
  const level = pad.top + tray.height;
  const bounds = { minX: x[0], maxX: x[1], minZ: z[0], maxZ: z[1] };
  return block({ ...bounds, minY: level, maxY: level + tray.depth }, trayColour);
}

function traySupports(): BufferGeometry[] {
  const { tray, traySupport, pad } = STATION_LAYOUT;
  const half = traySupport.size / 2;
  const supports: BufferGeometry[] = [];
  for (let x = tray.x[0] + traySupport.spacing / 2; x < tray.x[1]; x += traySupport.spacing) {
    const bounds = { minX: x - half, maxX: x + half, minZ: tray.z - half, maxZ: tray.z + half };
    supports.push(
      block({ ...bounds, minY: pad.top, maxY: pad.top + tray.height }, traySupport.colour),
    );
  }
  return supports;
}

function trays(): BufferGeometry[] {
  const { tray, radomes, radomeZ, plinth: shape, cabinets } = STATION_LAYOUT;
  const half = tray.width / 2;
  const across = (x: number): [number, number] => [x - half, x + half];
  const toRadomes = radomes.map((radome) =>
    trayRun(across(radome.x), [radomeZ + (radome.diameter / 2) * shape.radius, tray.z - half]),
  );
  const toCabinets = cabinets.map(({ at, size }) =>
    trayRun(across(at[0]), [tray.z + half, at[1] - size[2] / 2]),
  );
  return [
    trayRun(tray.x, [tray.z - half, tray.z + half]),
    ...toRadomes,
    ...toCabinets,
    ...traySupports(),
  ];
}

function lightPost([x, z]: Spot): BufferGeometry[] {
  const { lights } = STATION_LAYOUT;
  const pole = cylinder(
    lights.radius * lights.taper,
    lights.radius,
    0,
    lights.height,
    lights.segments,
  );
  const [width, height, depth] = lights.head;
  const inward = new Vector3(-Math.sign(x), 0, -Math.sign(z)).normalize();
  const head = new BoxGeometry(width, height, depth);
  head.lookAt(inward);
  head.translate(inward.x * width * lights.reach, lights.height, inward.z * width * lights.reach);
  return [part(pole, lights.colour), part(head, lights.headColour)].map((geometry) =>
    geometry.translate(x, 0, z),
  );
}

function bodyGeometry(): BufferGeometry {
  const { radomes, cabinets, lights, railColour } = STATION_LAYOUT;
  return mergeParts([
    ...radomes.flatMap(plinth),
    ...cabinets.flatMap(cabinet),
    ...trays(),
    ...lights.spots.flatMap(lightPost),
    ...fenceRails().map((rail) => part(rail, railColour)),
  ]);
}

function padGeometry(): BufferGeometry {
  const { half, top, base } = STATION_LAYOUT.pad;
  const slab = box({
    minX: -half[0],
    maxX: half[0],
    minY: base,
    maxY: top,
    minZ: -half[1],
    maxZ: half[1],
  });
  return metricUv(slab, PAD_MAP.tile);
}

function stationAnchor(origin: Vector3): Object3D {
  const middle = STATION_LAYOUT.radomes[1];
  const anchor = new Object3D();
  anchor.name = 'groundStationAnchor';
  anchor.position.copy(domeCentre(middle)).add(origin);
  anchor.position.y += middle.diameter / 2 + STATION_LAYOUT.anchorLift;
  return anchor;
}

export function createStation(context: PartContext, maps: StationMaps): StationPart {
  const { tracker } = context;
  const object = new Group();
  object.name = 'groundStation';
  object.position.set(...GROUND_STATION);
  const pad = { color: WHITE, map: tracker.track(padTexture()), ...PAD_FINISH };
  const body = { color: WHITE, map: maps.grain, vertexColors: true, ...BODY_FINISH };
  const radome = { color: THEME.radome, map: tracker.track(radomeTexture()), ...RADOME_FINISH };
  const mesh = { ...POST_FINISH, map: tracker.track(meshTexture()), ...MESH_FINISH };
  object.add(
    partMesh(context, padGeometry(), GROUP, pad),
    partMesh(context, bodyGeometry(), GROUP, body),
    partMesh(context, mergeParts(STATION_LAYOUT.radomes.map(dome)), GROUP, radome),
    instanced(context, fencePost(), GROUP, POST_FINISH, fencePostMatrices()),
    partMesh(context, fencePanels(), GROUP, mesh),
  );
  return { object, anchor: stationAnchor(object.position) };
}
