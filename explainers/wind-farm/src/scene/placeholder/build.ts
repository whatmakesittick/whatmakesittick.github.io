import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Quaternion,
  Vector3,
} from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { MaterialLibrary } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import type { ResourceTracker } from '@core/scene/resources';
import type { AnchorId, AssemblyState, PartId, Point } from '../../ids';
import { MAX_PLUME_D, ROTOR_DIAMETER_M, ROTOR_RADIUS_M, WAKE_DECAY } from '../../model';
import { terrainHeight } from '../../model';
import type { GroundPoint } from '../../model';
import { PART_FINISHES } from './finishes';

const ROUND_SEGMENTS = 24;
const GROUND_STEP_M = 100;
const ARROW_HEAD_SHARE = 0.3;
const ARROW_HEAD_WIDTH = 3;
const X_AXIS = new Vector3(1, 0, 0);
const QUARTER_TURN = Math.PI / 2;
const DEGREES_TO_RADIANS = Math.PI / 180;
const FACING_WEST_DEG = 270;

export const PLUME_REFERENCE_M = MAX_PLUME_D * ROTOR_DIAMETER_M;

export interface PlaceholderContext {
  materials: MaterialLibrary;
  tracker: ResourceTracker;
}

export interface PlaceholderScene {
  readonly root: Group;
  readonly labels: ReadonlyMap<PartId, Object3D>;
  readonly anchors: Partial<Record<AnchorId, Object3D>>;
  setState(state: AssemblyState): void;
  setAzimuth(azimuth: number): void;
}

export type Labels = Map<PartId, Object3D>;

export function label(labels: Labels, part: PartId, parent: Object3D, point: Point): void {
  labels.set(part, anchorAt(parent, ...point));
}

export function bearingTurn(bearingDeg: number): number {
  return (FACING_WEST_DEG - bearingDeg) * DEGREES_TO_RADIANS;
}

export function degrees(value: number): number {
  return value * DEGREES_TO_RADIANS;
}

export function namedGroup(name: string, parent?: Object3D): Group {
  const group = new Group();
  group.name = name;
  parent?.add(group);
  return group;
}

export function partMesh(
  context: PlaceholderContext,
  part: PartId,
  geometry: BufferGeometry,
  parent: Object3D,
): Mesh {
  const mesh = new Mesh(
    context.tracker.track(geometry),
    context.materials.get(part, PART_FINISHES[part]),
  );
  mesh.name = part;
  parent.add(mesh);
  return mesh;
}

export function instancedPart(
  context: PlaceholderContext,
  part: PartId,
  geometry: BufferGeometry,
  count: number,
  parent: Object3D,
): InstancedMesh {
  const material = context.materials.get(part, PART_FINISHES[part]);
  const mesh = context.tracker.track(
    new InstancedMesh(context.tracker.track(geometry), material, count),
  );
  mesh.name = part;
  mesh.frustumCulled = false;
  parent.add(mesh);
  return mesh;
}

export function merged(parts: readonly BufferGeometry[]): BufferGeometry {
  const geometry = mergeGeometries([...parts]);
  parts.forEach((part) => part.dispose());
  if (!geometry) throw new Error('Could not merge the placeholder geometries');
  return geometry;
}

export function boxAt(size: Point, centre: Point): BufferGeometry {
  return new BoxGeometry(...size).translate(...centre);
}

export function boxBetween(min: Point, max: Point): BufferGeometry {
  const size: Point = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const centre: Point = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  return boxAt(size, centre);
}

export function cylinderAlongX(
  minX: number,
  maxX: number,
  radius: number,
  y: number,
): BufferGeometry {
  return new CylinderGeometry(radius, radius, maxX - minX, ROUND_SEGMENTS)
    .rotateZ(QUARTER_TURN)
    .translate((minX + maxX) / 2, y, 0);
}

export function upright(bottomRadius: number, topRadius: number, height: number): BufferGeometry {
  return new CylinderGeometry(topRadius, bottomRadius, height, ROUND_SEGMENTS).translate(
    0,
    height / 2,
    0,
  );
}

function segmentBox(from: Vector3, to: Vector3, width: number, thickness: number): BufferGeometry {
  const direction = to.clone().sub(from);
  const length = direction.length();
  const rotation = new Quaternion().setFromUnitVectors(X_AXIS, direction.normalize());
  const placement = new Matrix4().compose(
    from.clone().add(to).multiplyScalar(0.5),
    rotation,
    new Vector3(1, 1, 1),
  );
  return new BoxGeometry(length, thickness, width).applyMatrix4(placement);
}

export function ribbon(
  points: readonly Vector3[],
  width: number,
  thickness = width,
): BufferGeometry {
  return merged(
    points.slice(1).map((point, index) => segmentBox(points[index], point, width, thickness)),
  );
}

export function groundPath(route: readonly GroundPoint[], lift: number): Vector3[] {
  return route.flatMap(([x, z], index) => {
    if (index === 0) return [new Vector3(x, terrainHeight(x, z) + lift, z)];
    const [fromX, fromZ] = route[index - 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(x - fromX, z - fromZ) / GROUND_STEP_M));
    return Array.from({ length: steps }, (_, step) => {
      const share = (step + 1) / steps;
      const pointX = fromX + (x - fromX) * share;
      const pointZ = fromZ + (z - fromZ) * share;
      return new Vector3(pointX, terrainHeight(pointX, pointZ) + lift, pointZ);
    });
  });
}

export function arrowAlongX(length: number, width: number, origin: Point): BufferGeometry {
  const headLength = length * ARROW_HEAD_SHARE;
  const shaftLength = length - headLength;
  const shaft = new BoxGeometry(shaftLength, width, width).translate(shaftLength / 2, 0, 0);
  const head = new ConeGeometry(width * ARROW_HEAD_WIDTH, headLength, ROUND_SEGMENTS)
    .rotateZ(-QUARTER_TURN)
    .translate(shaftLength + headLength / 2, 0, 0);
  return merged([shaft, head]).translate(...origin);
}

export function plumeGeometry(): BufferGeometry {
  const farRadius = ROTOR_RADIUS_M + WAKE_DECAY * PLUME_REFERENCE_M;
  return new CylinderGeometry(farRadius, ROTOR_RADIUS_M, PLUME_REFERENCE_M, ROUND_SEGMENTS, 1, true)
    .rotateZ(-QUARTER_TURN)
    .translate(PLUME_REFERENCE_M / 2, 0, 0);
}
