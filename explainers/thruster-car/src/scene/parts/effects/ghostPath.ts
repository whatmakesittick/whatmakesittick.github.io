import { Color, Group, Mesh, Object3D, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { lerp } from '@core/math';
import { createPointMaterial, PointCloud } from '@core/scene/pointCloud';
import type { MomentId } from '../../../ids';
import { CAR_ANCHORS } from '../../../model/layout';
import { MOMENTS, runAt } from '../../../model/run';
import { evenlySpaced } from '../../geometry/effects/path';
import { applyCarPose } from '../../pose';
import { registered } from '../context';
import type { PartContext } from '../context';
import { GHOST_FINISH, GHOST_PATH, POINT_SIZE_PER_METRE, RENDER_ORDER } from './constants';

export const GHOST_MOMENTS: readonly MomentId[] = ['leavesRamp', 'peak', 'rollComplete'];

const CENTRE = new Vector3(...CAR_ANCHORS.car);

function centreAt(seconds: number, pose: Object3D): Vector3 {
  applyCarPose(pose, runAt(seconds).car);
  pose.updateMatrix();
  return CENTRE.clone().applyMatrix4(pose.matrix);
}

export function ghostArc(): Vector3[] {
  const { leavesRamp, touchdown } = MOMENTS;
  const pose = new Object3D();
  const steps = Math.ceil((touchdown - leavesRamp) / GHOST_PATH.sampleSeconds);
  const samples = Array.from({ length: steps + 1 }, (_, index) =>
    centreAt(lerp(leavesRamp, touchdown, index / steps), pose),
  );
  return evenlySpaced(samples, GHOST_PATH.spacing);
}

function taper(index: number, count: number): number {
  return Math.min(1, (index + 1) / GHOST_PATH.taperDots, (count - index) / GHOST_PATH.taperDots);
}

function highest(points: readonly Vector3[]): Vector3 {
  return points.reduce((top, point) => (point.y > top.y ? point : top), points[0]);
}

export class GhostPath {
  readonly object = new Group();
  readonly label = new Object3D();

  constructor(context: PartContext, silhouette: BufferGeometry) {
    const dots = ghostArc();
    this.object.add(this.dotted(context, dots), this.label);
    const material = context.materials.get('ghostPath', GHOST_FINISH);
    GHOST_MOMENTS.forEach((id) => {
      const ghost = new Mesh(silhouette, material);
      ghost.renderOrder = RENDER_ORDER.ghost;
      applyCarPose(ghost, runAt(MOMENTS[id]).car);
      this.object.add(ghost);
    });
    this.label.position.copy(highest(dots)).setY(highest(dots).y + GHOST_PATH.labelLift);
    this.object.visible = false;
  }

  setState(shown: boolean): void {
    this.object.visible = shown;
  }

  private dotted(context: PartContext, dots: readonly Vector3[]): Object3D {
    const size = GHOST_PATH.diameter * POINT_SIZE_PER_METRE;
    const material = registered(
      context,
      'ghostPath',
      createPointMaterial(context.textures.dot, size),
    );
    const cloud = context.tracker.track(new PointCloud(dots.length, material, RENDER_ORDER.ghost));
    const { r, g, b } = new Color(GHOST_PATH.tone);
    dots.forEach((dot, index) => {
      cloud.setPoint(index, dot.x, dot.y, dot.z);
      cloud.setColor(index, r, g, b, GHOST_PATH.opacity * taper(index, dots.length));
    });
    cloud.commit();
    return cloud.points;
  }
}
