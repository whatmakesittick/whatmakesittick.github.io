import { Matrix4, Vector3 } from 'three';
import type { Quaternion } from 'three';
import type { Figure } from '@core/figure';
import { Retargeter, createRetargetTarget } from '@core/figure/retarget';
import type { Point, RetargetTarget } from '@core/figure/retarget';
import type { ArmId } from '../../../../ids';
import type { Skeleton } from '../../../rig/skeleton';

const SIDES: readonly ArmId[] = ['right', 'left'];
const AXES = 3;

const FIGURE_FROM_RIG = new Matrix4().set(0, 0, -1, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 1);
const scratch = new Vector3();

export function figureOrigin(figure: Figure): Vector3 {
  const joint = (name: string) => {
    const at = figure.jointIndex(name) * AXES;
    return new Vector3().fromArray(figure.jointPositions, at);
  };
  return joint('r_uparm').add(joint('l_uparm')).multiplyScalar(0.5);
}

export function rigFromFigure(origin: Vector3): Matrix4 {
  const toFigure = FIGURE_FROM_RIG.clone().setPosition(origin);
  return toFigure.invert();
}

export class FigureRig {
  readonly figure: Figure;
  readonly toRig: Matrix4;
  private readonly retargeter: Retargeter;
  private readonly origin: Vector3;
  private readonly target: RetargetTarget = createRetargetTarget();

  constructor(figure: Figure) {
    this.figure = figure;
    this.origin = figureOrigin(figure);
    this.toRig = rigFromFigure(this.origin);
    this.retargeter = new Retargeter(figure);
  }

  pose(skeleton: Skeleton): void {
    this.fill(skeleton);
    this.figure.pose(this.retargeter.solve(this.target));
  }

  retarget(skeleton: Skeleton): Float32Array {
    this.fill(skeleton);
    return this.retargeter.solve(this.target);
  }

  private fill(skeleton: Skeleton): void {
    SIDES.forEach((id) => {
      const arm = skeleton.arms[id];
      const out = this.target.arms[id];
      this.place(out.shoulder, arm.shoulder);
      this.place(out.elbow, arm.elbow);
      this.place(out.wrist, arm.wrist);
      this.direct(out.handAxis, arm.handAxis);
      this.direct(out.palm, arm.palm);
      const leg = skeleton.legs[id];
      const legOut = this.target.legs[id];
      this.place(legOut.hip, leg.hip);
      this.place(legOut.knee, leg.knee);
      this.place(legOut.ankle, leg.ankle);
      this.direct(legOut.footAxis, leg.footAxis);
      this.direct(legOut.sole, leg.sole);
    });
    this.rotate(skeleton.head);
  }

  private place(out: Point, rig: Vector3): void {
    scratch.copy(rig).applyMatrix4(FIGURE_FROM_RIG).add(this.origin);
    out.x = scratch.x;
    out.y = scratch.y;
    out.z = scratch.z;
  }

  private direct(out: Point, rig: Vector3): void {
    scratch.copy(rig).applyMatrix4(FIGURE_FROM_RIG);
    out.x = scratch.x;
    out.y = scratch.y;
    out.z = scratch.z;
  }

  private rotate(head: Quaternion): void {
    scratch.set(head.x, head.y, head.z).applyMatrix4(FIGURE_FROM_RIG);
    const out = this.target.head;
    out.x = scratch.x;
    out.y = scratch.y;
    out.z = scratch.z;
    out.w = head.w;
  }
}
