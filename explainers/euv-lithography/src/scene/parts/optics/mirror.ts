import { CylinderGeometry, Vector2 } from 'three';
import type { BufferGeometry, InstancedMesh, Object3D } from 'three';
import { latheAlongX } from '@core/scene/geometry/lathe';
import type { PartId, Point } from '../../../ids';
import { BEAM_WAYPOINTS, mirrorSizeM } from '../../../model/layout';
import type { WaypointId } from '../../../model/layout';
import type { Finish } from '../../finishes';
import type { PartContext } from '../context';
import { facing, instanced, mirrorNormal, placement } from '../kit';
import type { Bin } from './geo';
import { joined, rod, ring, slab } from './geo';

const FACE_SEGMENTS = 32;
const DISH_STEPS = 6;
const FACE_THICKNESS = 0.05;
const SAG = 0.022;
const SUBSTRATE_RADIUS = 0.47;
const SUBSTRATE_HEIGHT = 0.2;
const FLANGE_INNER = 0.44;
const FLANGE_OUTER = 0.56;
const FLANGE_THICKNESS = 0.07;
const FLANGE_Y = -(FACE_THICKNESS + 0.08);
const STRUTS = 3;
const STRUT_RADIUS = 0.016;
const STRUT_RING_RADIUS = 0.5;
const STRUT_PLATE_RADIUS = 0.44;
const BACK_Y = -(FACE_THICKNESS + 0.34);
const BACK_THICKNESS = 0.06;
const BACK_RADIUS = 0.55;
const BOSS_RADIUS = 0.12;
const BOSS_DEPTH = 0.06;
const BRACKET_RADIUS = 0.02;
const PAD_HALF = 0.06;
const PAD_DEPTH = 0.02;
const CYLINDER_SIDES = 28;

function faceGeometry(): BufferGeometry {
  const radius = 0.5;
  const profile = [new Vector2(0, -FACE_THICKNESS), new Vector2(radius, -FACE_THICKNESS)];
  profile.push(new Vector2(radius, 0));
  for (let step = 1; step <= DISH_STEPS; step += 1) {
    const r = radius * (1 - step / DISH_STEPS);
    profile.push(new Vector2(r, -SAG * (1 - (r / radius) ** 2)));
  }
  return latheAlongX(profile, FACE_SEGMENTS).rotateZ(Math.PI / 2);
}

function substrateGeometry(): BufferGeometry {
  const geometry = new CylinderGeometry(
    SUBSTRATE_RADIUS,
    SUBSTRATE_RADIUS,
    SUBSTRATE_HEIGHT,
    CYLINDER_SIDES,
  );
  return geometry.translate(0, -FACE_THICKNESS - SUBSTRATE_HEIGHT / 2, 0);
}

function mountGeometry(): BufferGeometry {
  const struts = Array.from({ length: STRUTS }, (_, index) => {
    const angle = (index / STRUTS) * Math.PI * 2;
    const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
    const from: Point = [cos * STRUT_RING_RADIUS, FLANGE_Y, sin * STRUT_RING_RADIUS];
    const to: Point = [cos * STRUT_PLATE_RADIUS, BACK_Y, sin * STRUT_PLATE_RADIUS];
    return rod(from, to, STRUT_RADIUS);
  });
  const plate = new CylinderGeometry(BACK_RADIUS, BACK_RADIUS, BACK_THICKNESS, CYLINDER_SIDES);
  plate.translate(0, BACK_Y, 0);
  const boss = new CylinderGeometry(BOSS_RADIUS, BOSS_RADIUS, BOSS_DEPTH, CYLINDER_SIDES);
  boss.translate(0, BACK_Y - (BACK_THICKNESS + BOSS_DEPTH) / 2, 0);
  return joined([...struts, plate, boss]);
}

const PIECES: readonly (readonly [Finish, () => BufferGeometry])[] = [
  ['mirror', faceGeometry],
  ['ceramic', substrateGeometry],
  ['flange', () => ring('y', [0, FLANGE_Y, 0], FLANGE_INNER, FLANGE_OUTER, FLANGE_THICKNESS)],
  ['darkFrame', mountGeometry],
];

interface Neighbours {
  readonly centre: Point;
  readonly normal: ReturnType<typeof mirrorNormal>;
}

function neighbours(id: WaypointId): Neighbours {
  const index = BEAM_WAYPOINTS.findIndex((entry) => entry.id === id);
  const [previous, here, next] = [-1, 0, 1].map((offset) => BEAM_WAYPOINTS[index + offset].point);
  return { centre: here, normal: mirrorNormal(previous, here, next) };
}

export interface MirrorSet {
  readonly meshes: InstancedMesh[];
  resize(id: WaypointId, metres: number): void;
}

export interface MirrorOptions {
  readonly group: PartId;
  readonly ids: readonly WaypointId[];
  readonly parent: Object3D;
  readonly bracketBin: Bin;
  readonly wallZ: number;
  readonly sizeOf: (id: WaypointId) => number;
}

export function mirrorSet(context: PartContext, options: MirrorOptions): MirrorSet {
  const placed = options.ids.map((id) => ({ id, ...neighbours(id) }));
  const matrixFor = (index: number, metres: number) => {
    const { centre, normal } = placed[index];
    return placement(centre, [metres, metres, metres], facing(normal));
  };
  const meshes = PIECES.map(([finish, build]) =>
    instanced(
      context,
      build(),
      options.group,
      finish,
      placed.map((_, index) => matrixFor(index, options.sizeOf(placed[index].id))),
    ),
  );
  meshes.forEach((target) => {
    target.frustumCulled = false;
    options.parent.add(target);
  });
  placed.forEach(({ id, centre, normal }) => addBracket(options, id, centre, normal));
  return {
    meshes,
    resize(id, metres) {
      const index = placed.findIndex((entry) => entry.id === id);
      meshes.forEach((target) => {
        target.setMatrixAt(index, matrixFor(index, metres));
        target.instanceMatrix.needsUpdate = true;
      });
    },
  };
}

function addBracket(
  options: MirrorOptions,
  id: WaypointId,
  centre: Point,
  normal: ReturnType<typeof mirrorNormal>,
): void {
  const sizes = [mirrorSizeM(id, 'na033'), mirrorSizeM(id, 'na055')];
  const behind = (metres: number): Point => [
    centre[0] - normal.x * metres * -BACK_Y,
    centre[1] - normal.y * metres * -BACK_Y,
    0,
  ];
  const start = behind(Math.max(...sizes));
  const end: Point = [start[0], start[1], options.wallZ];
  options.bracketBin
    .add('darkFrame', rod(start, end, BRACKET_RADIUS))
    .add(
      'frame',
      slab(
        [start[0] - PAD_HALF, start[1] - PAD_HALF, options.wallZ],
        [start[0] + PAD_HALF, start[1] + PAD_HALF, options.wallZ + PAD_DEPTH],
      ),
    );
  if (sizes[0] !== sizes[1]) {
    options.bracketBin.add('darkFrame', rod(behind(Math.min(...sizes)), start, BRACKET_RADIUS));
  }
}
