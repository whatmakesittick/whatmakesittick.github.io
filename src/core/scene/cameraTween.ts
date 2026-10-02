import { Spherical, Vector3 } from 'three';
import type { Quaternion } from 'three';
import { CAMERA_TWEEN_SECONDS } from './constants';
import type { CameraPose } from './frameBox';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function shortestAngle(from: number, to: number): number {
  const delta = to - from;
  return from + Math.atan2(Math.sin(delta), Math.cos(delta));
}

function orbitOf(pose: CameraPose): Spherical {
  return new Spherical().setFromVector3(pose.position.clone().sub(pose.target));
}

export class CameraTween {
  private readonly from: CameraPose;
  private readonly to: CameraPose;
  private elapsed = 0;

  constructor(from: CameraPose, to: CameraPose) {
    this.from = { position: from.position.clone(), target: from.target.clone() };
    this.to = { position: to.position.clone(), target: to.target.clone() };
  }

  get finished(): boolean {
    return this.elapsed >= CAMERA_TWEEN_SECONDS;
  }

  shift(delta: Vector3): void {
    [this.from, this.to].forEach((pose) => {
      pose.position.add(delta);
      pose.target.add(delta);
    });
  }

  turn(pivot: Vector3, rotation: Quaternion): void {
    [this.from, this.to].forEach((pose) => {
      pose.position.sub(pivot).applyQuaternion(rotation).add(pivot);
      pose.target.sub(pivot).applyQuaternion(rotation).add(pivot);
    });
  }

  advance(deltaSeconds: number): CameraPose {
    this.elapsed = Math.min(CAMERA_TWEEN_SECONDS, this.elapsed + deltaSeconds);
    return this.poseAt(easeInOutCubic(this.elapsed / CAMERA_TWEEN_SECONDS));
  }

  private poseAt(t: number): CameraPose {
    const target = this.from.target.clone().lerp(this.to.target, t);
    const from = orbitOf(this.from);
    const to = orbitOf(this.to);
    const theta = shortestAngle(from.theta, to.theta);
    const orbit = new Spherical(
      from.radius + (to.radius - from.radius) * t,
      from.phi + (to.phi - from.phi) * t,
      from.theta + (theta - from.theta) * t,
    );
    return { position: new Vector3().setFromSpherical(orbit).add(target), target };
  }
}
