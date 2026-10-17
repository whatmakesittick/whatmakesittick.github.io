import { Color, Group, InstancedMesh, Object3D, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { lerp } from '@core/math';
import { createPointMaterial, PointCloud } from '@core/scene/pointCloud';
import type { MomentId } from '../../../ids';
import { CAR_ANCHORS } from '../../../model/layout';
import { carAt, MOMENTS } from '../../../model/run';
import { evenlySpaced } from '../../geometry/effects/path';
import { applyCarPose } from '../../pose';
import { registered } from '../context';
import type { PartContext } from '../context';
import { GHOST_FINISH, GHOST_PATH, POINT_SIZE_PER_METRE, RENDER_ORDER } from './constants';

export type GhostArc = readonly [from: MomentId, to: MomentId];

export const GHOST_ARCS: readonly GhostArc[] = [
  ['leavesRamp', 'touchdown'],
  ['liftOff', 'landed'],
];

export const GHOST_MOMENTS: readonly MomentId[] = [
  'inverted',
  'leavesRamp',
  'rollComplete',
  'liftOff',
  'apex',
  'twistComplete',
];

export const GHOST_NAME = 'ghostSilhouettes';

const CENTRE = new Vector3(...CAR_ANCHORS.car);

function centreAt(seconds: number, pose: Object3D): Vector3 {
  applyCarPose(pose, carAt(seconds));
  pose.updateMatrix();
  return CENTRE.clone().applyMatrix4(pose.matrix);
}

export function ghostArc([from, to]: GhostArc): Vector3[] {
  const start = MOMENTS[from];
  const end = MOMENTS[to];
  const pose = new Object3D();
  const steps = Math.ceil((end - start) / GHOST_PATH.sampleSeconds);
  const samples = Array.from({ length: steps + 1 }, (_, index) =>
    centreAt(lerp(start, end, index / steps), pose),
  );
  return evenlySpaced(samples, GHOST_PATH.spacing);
}

function taper(index: number, count: number): number {
  return Math.min(1, (index + 1) / GHOST_PATH.taperDots, (count - index) / GHOST_PATH.taperDots);
}

function highest(points: readonly Vector3[]): Vector3 {
  return points.reduce((top, point) => (point.y > top.y ? point : top), points[0]);
}

function silhouettes(context: PartContext, silhouette: BufferGeometry): InstancedMesh {
  const material = context.materials.get('ghostPath', GHOST_FINISH);
  const mesh = new InstancedMesh(silhouette, material, GHOST_MOMENTS.length);
  const pose = new Object3D();
  GHOST_MOMENTS.forEach((id, index) => {
    applyCarPose(pose, carAt(MOMENTS[id]));
    pose.updateMatrix();
    mesh.setMatrixAt(index, pose.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.renderOrder = RENDER_ORDER.ghost;
  mesh.name = GHOST_NAME;
  return mesh;
}

export class GhostPath {
  readonly object = new Group();
  readonly label = new Object3D();

  constructor(context: PartContext, silhouette: BufferGeometry) {
    const arcs = GHOST_ARCS.map(ghostArc);
    const top = highest(arcs.flat());
    this.label.position.set(top.x, top.y + GHOST_PATH.labelLift, top.z);
    this.object.add(this.dotted(context, arcs), silhouettes(context, silhouette), this.label);
    this.object.visible = false;
  }

  setState(shown: boolean): void {
    this.object.visible = shown;
  }

  private dotted(context: PartContext, arcs: readonly Vector3[][]): Object3D {
    const size = GHOST_PATH.diameter * POINT_SIZE_PER_METRE;
    const material = registered(
      context,
      'ghostPath',
      createPointMaterial(context.textures.dot, size),
    );
    const count = arcs.reduce((sum, arc) => sum + arc.length, 0);
    const cloud = context.tracker.track(new PointCloud(count, material, RENDER_ORDER.ghost));
    const { r, g, b } = new Color(GHOST_PATH.tone);
    let slot = 0;
    arcs.forEach((arc) =>
      arc.forEach((dot, index) => {
        cloud.setPoint(slot, dot.x, dot.y, dot.z);
        cloud.setColor(slot, r, g, b, GHOST_PATH.opacity * taper(index, arc.length));
        slot++;
      }),
    );
    cloud.commit();
    return cloud.points;
  }
}
