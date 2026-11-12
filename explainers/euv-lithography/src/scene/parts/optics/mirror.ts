import { CylinderGeometry, InstancedMesh, MeshPhysicalMaterial, Vector2 } from 'three';
import type { BufferGeometry, Matrix4, Object3D } from 'three';
import { latheAlongX } from '@core/scene/geometry/lathe';
import type { PartId, Point } from '../../../ids';
import { BEAM_WAYPOINTS, mirrorSizeM } from '../../../model/layout';
import type { WaypointId } from '../../../model/layout';
import type { Finish } from '../../finishes';
import type { PartContext } from '../context';
import { registeredMaterial } from '../context';
import { facing, instanced, mirrorNormal, placement } from '../kit';
import type { Bin } from './geo';
import { THEME } from '../../../theme';
import { workshopEnvironment } from './environment';
import { facetField } from './facets';
import { ring, rod, slab } from './geo';
import { BACK_Y, FACE_THICKNESS, MOUNT_PIECES } from './mount';

const FACE_SEGMENTS = 32;
const DISH_STEPS = 6;
const SAG = 0.022;
const SUBSTRATE_RADIUS = 0.47;
const SUBSTRATE_HEIGHT = 0.2;
const RIM_INNER = 0.47;
const RIM_OUTER = 0.515;
const BRACKET_RADIUS = 0.02;
const PAD_HALF = 0.06;
const PAD_DEPTH = 0.02;
const CYLINDER_SIDES = 28;
const ENV_INTENSITY = 2.2;
const FACETED: ReadonlySet<WaypointId> = new Set(['i1', 'i2']);
const COATING = {
  color: THEME.mirror,
  metalness: 1,
  roughness: 0.08,
  envMapIntensity: ENV_INTENSITY,
} as const;

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

function rimGeometry(): BufferGeometry {
  return ring(
    'y',
    [0, -FACE_THICKNESS / 2 + 0.004, 0],
    RIM_INNER,
    RIM_OUTER,
    FACE_THICKNESS + 0.008,
  );
}

const PIECES: readonly (readonly [Finish, () => BufferGeometry])[] = [
  ['mirror', faceGeometry],
  ['granite', substrateGeometry],
  ['flange', rimGeometry],
  ...MOUNT_PIECES,
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

function coated(
  context: PartContext,
  geometry: BufferGeometry,
  material: MeshPhysicalMaterial,
  matrices: readonly Matrix4[],
): InstancedMesh {
  const target = context.tracker.track(
    new InstancedMesh(context.tracker.track(geometry), material, matrices.length),
  );
  matrices.forEach((matrix, index) => target.setMatrixAt(index, matrix));
  return target;
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
  const matrices = placed.map((_, index) => matrixFor(index, options.sizeOf(placed[index].id)));
  const coating = registeredMaterial(context, options.group, new MeshPhysicalMaterial(COATING));
  coating.envMap = workshopEnvironment(context);
  const meshes = PIECES.map(([finish, build]) =>
    finish === 'mirror'
      ? coated(context, build(), coating, matrices)
      : instanced(context, build(), options.group, finish, matrices),
  );
  const faceted = placed.flatMap(({ id }, index) => (FACETED.has(id) ? [index] : []));
  const field = facetField(
    context,
    coating,
    faceted.map((index) => matrices[index]),
  );
  if (faceted.length > 0) meshes.push(field.mesh);
  meshes.forEach((target) => {
    target.frustumCulled = false;
    options.parent.add(target);
  });
  placed.forEach(({ id, centre, normal }) => addBracket(options, id, centre, normal));
  return {
    meshes,
    resize(id, metres) {
      const index = placed.findIndex((entry) => entry.id === id);
      const matrix = matrixFor(index, metres);
      meshes.forEach((target) => {
        if (target !== field.mesh) {
          target.setMatrixAt(index, matrix);
          target.instanceMatrix.needsUpdate = true;
        }
      });
      const slot = faceted.indexOf(index);
      if (slot >= 0) field.place(slot, matrix);
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
