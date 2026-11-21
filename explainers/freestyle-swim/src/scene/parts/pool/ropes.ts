import {
  CylinderGeometry,
  Group,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  Mesh,
  Object3D,
  Vector2,
} from 'three';
import type { BufferGeometry, MeshStandardMaterial } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { ROPE_Z_M } from '../../../model';
import { FINISHES } from '../../finishes';
import type { PartContext } from '../context';
import {
  CORD_RADIUS_M,
  CORD_SEGMENTS,
  FLOAT_LENGTH_M,
  FLOAT_LIFT_M,
  FLOAT_PITCH_M,
  FLOAT_RADIUS_M,
  FLOAT_SEGMENTS,
  HALF_EXTENT_M,
  NEIGHBOUR_ROPE_Z,
  ROPE_LABEL_OFFSET,
} from './constants';

const FLOAT_COUNT = Math.round((HALF_EXTENT_M * 2) / FLOAT_PITCH_M) + 4;
const HALF_PROFILE: readonly (readonly [number, number])[] = [
  [0, -0.065],
  [0.03, -0.065],
  [0.062, -0.06],
  [0.075, -0.052],
  [0.075, -0.04],
  [0.066, -0.035],
  [0.05, -0.031],
  [0.05, -0.024],
  [0.066, -0.02],
  [0.075, -0.015],
  [0.075, -0.004],
];
const PROFILE_SCALE = FLOAT_LENGTH_M / 0.13;

export interface Ropes {
  readonly root: Group;
  readonly scrolling: readonly Group[];
  readonly label: Object3D;
}

function floatGeometry(): BufferGeometry {
  const mirrored = [...HALF_PROFILE]
    .reverse()
    .map(([radius, height]) => [radius, -height] as const);
  const points = [...HALF_PROFILE, ...mirrored.slice(0, -1), [0, 0.065] as const];
  const radiusScale = (FLOAT_RADIUS_M / 0.075) * PROFILE_SCALE;
  const profile = points.map(
    ([radius, height]) => new Vector2(radius * radiusScale, height * PROFILE_SCALE),
  );
  return new LatheGeometry(profile, FLOAT_SEGMENTS).rotateZ(-Math.PI / 2);
}

function cordGeometry(zs: readonly number[]): BufferGeometry {
  const length = HALF_EXTENT_M * 2 + 4 * FLOAT_PITCH_M;
  const cords = zs.map((z) =>
    new CylinderGeometry(CORD_RADIUS_M, CORD_RADIUS_M, length, CORD_SEGMENTS, 1, true)
      .rotateZ(Math.PI / 2)
      .translate(FLOAT_PITCH_M, FLOAT_LIFT_M, z),
  );
  const merged = mergeGeometries(cords);
  cords.forEach((cord) => cord.dispose());
  return merged;
}

function floatsOf(
  geometry: BufferGeometry,
  material: MeshStandardMaterial,
  zs: readonly number[],
  parity: number,
): InstancedMesh {
  const xs = Array.from({ length: FLOAT_COUNT }, (_, index) => index).filter(
    (index) => index % 2 === parity,
  );
  const mesh = new InstancedMesh(geometry, material, xs.length * zs.length);
  const matrix = new Matrix4();
  zs.forEach((z, row) =>
    xs.forEach((index, column) => {
      matrix.makeTranslation(-HALF_EXTENT_M + index * FLOAT_PITCH_M, FLOAT_LIFT_M, z);
      mesh.setMatrixAt(row * xs.length + column, matrix);
    }),
  );
  mesh.frustumCulled = false;
  return mesh;
}

const NEAR_CUT_M = 1.1;
const BEYOND_REACH = 1.15;
const FLOAT_FILTER_M = 4;
export const ROPE_GROUP_NAMES: readonly string[] = ['ropeScroll', 'ropeNeighbours'];

export function isNearRope(object: Object3D, distance: number): boolean {
  const limit = object instanceof InstancedMesh ? FLOAT_FILTER_M : NEAR_CUT_M;
  return distance < limit && ROPE_GROUP_NAMES.includes(object.parent?.name ?? '');
}

function fadeNearCamera(material: MeshStandardMaterial): void {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'varying vec3 vRopeWorld;\nvarying float vRopeCut;\nvoid main() {')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
  vec4 ropeLocal = vec4(transformed, 1.0);
  vRopeCut = ${NEAR_CUT_M.toFixed(2)};
  #ifdef USE_INSTANCING
  ropeLocal = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float ropeZ = (modelMatrix * ropeLocal).z;
  if (cameraPosition.z * ropeZ > 0.0 && abs(cameraPosition.z) > abs(ropeZ)) vRopeCut = length(cameraPosition.yz) * ${BEYOND_REACH};
  #endif
  vRopeWorld = (modelMatrix * ropeLocal).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'varying vec3 vRopeWorld;\nvarying float vRopeCut;\nvoid main() {')
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
  if (distance(vRopeWorld, cameraPosition) < vRopeCut) discard;`,
      );
  };
  material.customProgramCacheKey = () => 'ropeFade';
}

function addRopes(
  context: PartContext,
  group: string,
  zs: readonly number[],
  geometry: BufferGeometry,
  target: Group,
): void {
  const { materials, tracker } = context;
  const [a, b, cordMaterial] = [FINISHES.floatA, FINISHES.floatB, FINISHES.ropeCord].map(
    (finish) => {
      const material = materials.get(group, finish);
      fadeNearCamera(material);
      return material;
    },
  );
  target.add(floatsOf(geometry, a, zs, 0), floatsOf(geometry, b, zs, 1));
  const cord = new Mesh(tracker.track(cordGeometry(zs)), cordMaterial);
  cord.frustumCulled = false;
  target.add(cord);
}

export function createRopes(context: PartContext): Ropes {
  const geometry = context.tracker.track(floatGeometry());
  const main = new Group();
  main.name = 'ropeScroll';
  addRopes(context, 'laneRope', [-ROPE_Z_M, ROPE_Z_M], geometry, main);
  const neighbours = new Group();
  neighbours.name = 'ropeNeighbours';
  addRopes(context, UNDIMMED_GROUP, [-NEIGHBOUR_ROPE_Z, NEIGHBOUR_ROPE_Z], geometry, neighbours);
  const label = new Object3D();
  label.position.set(ROPE_LABEL_OFFSET.x, ROPE_LABEL_OFFSET.y, ROPE_Z_M);
  const root = new Group();
  root.add(main, neighbours, label);
  return { root, scrolling: [main, neighbours], label };
}
