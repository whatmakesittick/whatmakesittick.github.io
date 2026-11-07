import { BufferGeometry, Float32BufferAttribute, Mesh, Vector3 } from 'three';
import type { Group, Material } from 'three';
import { FULL_TURN } from '@core/math';
import { REGISTER_IDS } from '../../../ids';
import type { Point, RegisterId } from '../../../ids';
import { PLAYED_KEY } from '../../../model';
import { FINISHES } from '../../finishes';
import { namedGroup } from '../context';
import type { PartContext } from '../context';
import { STRING_RADIUS, WINDING } from './constants';
import { pointAlong, unisonOf } from './layout';
import type { PianoString } from './layout';
import { patchedMaterial } from './materials';
import type { VertexPatch } from './patches';
import { distance, radiusOf, speakingEnd } from './stringEnds';
import { WINDING_TILE, windingTexture } from './winding';

const WAVE_SEGMENTS = 64;
const RADIAL_SIDES = 8;
const STILL = -1;
const XYZ = 3;
const UV = 2;

interface Station {
  readonly along: number;
  readonly radius: number;
}

interface Run {
  readonly start: Point;
  readonly direction: Point;
  readonly stations: readonly Station[];
  readonly wave: (along: number) => number;
}

class TubeBuffers {
  readonly positions: number[] = [];
  readonly normals: number[] = [];
  readonly uvs: number[] = [];
  readonly waves: number[] = [];
  readonly indices: number[] = [];

  get rings(): number {
    return this.positions.length / XYZ / (RADIAL_SIDES + 1);
  }
}

function speakingRun(string: PianoString): Run {
  const end = distance(string.front, speakingEnd(string));
  const hitch = distance(string.front, string.hitch);
  const core = radiusOf(string);
  const wound = string.band === 'bass';
  const radius = wound ? STRING_RADIUS.wound : core;
  const gap = wound ? WINDING.frontGap : 0;
  const wave = Array.from({ length: WAVE_SEGMENTS + 1 }, (_, index) => ({
    along: gap + ((end - gap) * index) / WAVE_SEGMENTS,
    radius,
  }));
  return {
    start: string.front,
    direction: string.direction,
    stations: [
      { along: 0, radius: core },
      { along: gap, radius: core },
      ...wave,
      { along: end, radius: core },
      { along: hitch, radius: core },
    ],
    wave: (along) => (along > end ? STILL : along / end),
  };
}

function pinRun(string: PianoString): Run {
  const length = distance(string.pin, string.front);
  const core = radiusOf(string);
  const direction: Point = [
    (string.front[0] - string.pin[0]) / length,
    0,
    (string.front[2] - string.pin[2]) / length,
  ];
  return {
    start: string.pin,
    direction,
    stations: [
      { along: 0, radius: core },
      { along: length, radius: core },
    ],
    wave: () => STILL,
  };
}

function addRun(buffers: TubeBuffers, run: Run, slot: number): void {
  const direction = new Vector3(...run.direction).normalize();
  const side = new Vector3().crossVectors(direction, new Vector3(0, 1, 0)).normalize();
  const up = new Vector3().crossVectors(side, direction);
  const normal = new Vector3();
  run.stations.forEach(({ along, radius }, station) => {
    const centre: Point = pointAlong(run.start, run.direction, along);
    const first = buffers.rings;
    for (let corner = 0; corner <= RADIAL_SIDES; corner += 1) {
      const angle = (corner / RADIAL_SIDES) * FULL_TURN;
      normal.copy(side).multiplyScalar(Math.cos(angle)).addScaledVector(up, Math.sin(angle));
      buffers.positions.push(
        centre[0] + normal.x * radius,
        centre[1] + normal.y * radius,
        centre[2] + normal.z * radius,
      );
      buffers.normals.push(normal.x, normal.y, normal.z);
      buffers.uvs.push(corner / RADIAL_SIDES, along / WINDING_TILE);
      buffers.waves.push(run.wave(along), slot);
    }
    if (station === 0) return;
    const ring = RADIAL_SIDES + 1;
    for (let corner = 0; corner < RADIAL_SIDES; corner += 1) {
      const a = (first - 1) * ring + corner;
      const b = first * ring + corner;
      buffers.indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  });
}

function unisonGeometry(strings: readonly PianoString[]): BufferGeometry {
  const buffers = new TubeBuffers();
  strings.forEach((string, slot) => {
    addRun(buffers, pinRun(string), slot);
    addRun(buffers, speakingRun(string), slot);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(buffers.positions, XYZ));
  geometry.setAttribute('normal', new Float32BufferAttribute(buffers.normals, XYZ));
  geometry.setAttribute('uv', new Float32BufferAttribute(buffers.uvs, UV));
  geometry.setAttribute('aWave', new Float32BufferAttribute(buffers.waves, UV));
  geometry.setIndex(buffers.indices);
  return geometry;
}

export interface PlayedStrings {
  readonly group: Group;
  readonly meshes: Readonly<Record<RegisterId, Mesh>>;
  show(register: RegisterId): void;
}

export function createPlayedStrings(context: PartContext, wave: VertexPatch): PlayedStrings {
  const steel = patchedMaterial(context, { group: 'strings', finish: FINISHES.steel, patch: wave });
  const copper = patchedMaterial(context, {
    group: 'strings',
    finish: FINISHES.copper,
    patch: wave,
    extra: { bumpMap: windingTexture(context, 1) },
  });
  const group = namedGroup('strings');
  const meshFor = (register: RegisterId): Mesh => {
    const unison = unisonOf(PLAYED_KEY[register]);
    const material: Material = unison[0].band === 'bass' ? copper : steel;
    const mesh = new Mesh(context.tracker.track(unisonGeometry(unison)), material);
    mesh.name = 'strings';
    group.add(mesh);
    return mesh;
  };
  const meshes = Object.fromEntries(
    REGISTER_IDS.map((register) => [register, meshFor(register)]),
  ) as Record<RegisterId, Mesh>;
  return {
    group,
    meshes,
    show(register) {
      REGISTER_IDS.forEach((id) => (meshes[id].visible = id === register));
    },
  };
}
