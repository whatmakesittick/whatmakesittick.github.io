import { Vector3 } from 'three';
import type { Quaternion, Matrix4 } from 'three';
import type { Figure } from '@core/figure';
import { Retargeter, createRetargetTarget } from '../retarget';
import type { Point, RetargetTarget, Side } from '../retarget';

const SIDES: readonly Side[] = ['right', 'left'];
const AXES = 3;

export interface RigArm {
  readonly shoulder: Vector3;
  readonly elbow: Vector3;
  readonly wrist: Vector3;
  readonly handAxis: Vector3;
  readonly palm: Vector3;
}

export interface RigLeg {
  readonly hip: Vector3;
  readonly knee: Vector3;
  readonly ankle: Vector3;
  readonly footAxis: Vector3;
  readonly sole: Vector3;
}

export interface RigPose {
  readonly arms: Readonly<Record<Side, RigArm>>;
  readonly legs: Readonly<Record<Side, RigLeg>>;
  readonly head: Quaternion;
}

const scratch = new Vector3();

export function figureOrigin(figure: Figure): Vector3 {
  const joint = (name: string) => {
    const at = figure.jointIndex(name) * AXES;
    return new Vector3().fromArray(figure.jointPositions, at);
  };
  return joint('r_uparm').add(joint('l_uparm')).multiplyScalar(0.5);
}

export function rigFromFigure(figureFromRig: Matrix4, origin: Vector3): Matrix4 {
  return figureFromRig.clone().setPosition(origin).invert();
}

export class FigureRig {
  readonly figure: Figure;
  readonly toRig: Matrix4;
  private readonly figureFromRig: Matrix4;
  private readonly retargeter: Retargeter;
  private readonly origin: Vector3;
  private readonly target: RetargetTarget = createRetargetTarget();

  constructor(figure: Figure, figureFromRig: Matrix4) {
    this.figure = figure;
    this.figureFromRig = figureFromRig;
    this.origin = figureOrigin(figure);
    this.toRig = rigFromFigure(figureFromRig, this.origin);
    this.retargeter = new Retargeter(figure);
  }

  pose(pose: RigPose): void {
    this.fill(pose);
    this.figure.pose(this.retargeter.solve(this.target));
  }

  retarget(pose: RigPose): Float32Array {
    this.fill(pose);
    return this.retargeter.solve(this.target);
  }

  private fill(pose: RigPose): void {
    SIDES.forEach((id) => {
      const arm = pose.arms[id];
      const out = this.target.arms[id];
      this.place(out.shoulder, arm.shoulder);
      this.place(out.elbow, arm.elbow);
      this.place(out.wrist, arm.wrist);
      this.direct(out.handAxis, arm.handAxis);
      this.direct(out.palm, arm.palm);
      const leg = pose.legs[id];
      const legOut = this.target.legs[id];
      this.place(legOut.hip, leg.hip);
      this.place(legOut.knee, leg.knee);
      this.place(legOut.ankle, leg.ankle);
      this.direct(legOut.footAxis, leg.footAxis);
      this.direct(legOut.sole, leg.sole);
    });
    this.rotate(pose.head);
  }

  private place(out: Point, rig: Vector3): void {
    scratch.copy(rig).applyMatrix4(this.figureFromRig).add(this.origin);
    out.x = scratch.x;
    out.y = scratch.y;
    out.z = scratch.z;
  }

  private direct(out: Point, rig: Vector3): void {
    scratch.copy(rig).applyMatrix4(this.figureFromRig);
    out.x = scratch.x;
    out.y = scratch.y;
    out.z = scratch.z;
  }

  private rotate(head: Quaternion): void {
    scratch.set(head.x, head.y, head.z).applyMatrix4(this.figureFromRig);
    const out = this.target.head;
    out.x = scratch.x;
    out.y = scratch.y;
    out.z = scratch.z;
    out.w = head.w;
  }
}
