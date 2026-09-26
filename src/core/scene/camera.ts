import { PerspectiveCamera, Sphere } from 'three';
import type { Box3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  CAMERA_DAMPING,
  CAMERA_FAR,
  CAMERA_FOV,
  CAMERA_MAX_DISTANCE_FACTOR,
  CAMERA_MAX_POLAR,
  CAMERA_MIN_DISTANCE_FACTOR,
  CAMERA_NEAR,
} from './constants';
import { CameraTween } from './cameraTween';
import type { CameraPose } from './frameBox';
import { NO_SAFE_AREA, applyLens, framingSlopes } from './lens';
import type { FramingSlopes, ViewportSize } from './lens';

const TARGET_FLOOR_MARGIN = 1;

export class CameraRig {
  readonly camera = new PerspectiveCamera(CAMERA_FOV, 1, CAMERA_NEAR, CAMERA_FAR);
  readonly controls: OrbitControls;
  private tween: CameraTween | null = null;
  private floorHeight = -Infinity;
  private boundsRadius = 1;
  private viewport: ViewportSize = { width: 1, height: 1, safe: NO_SAFE_AREA };

  constructor(domElement: HTMLElement) {
    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = CAMERA_DAMPING;
    this.controls.maxPolarAngle = CAMERA_MAX_POLAR;
    this.controls.screenSpacePanning = true;
    this.controls.addEventListener('start', this.cancelTween);
  }

  setViewport(size: ViewportSize): void {
    this.viewport = size;
    applyLens(this.camera, size);
    this.updateDistanceLimits();
  }

  framing(): FramingSlopes {
    return framingSlopes(this.viewport);
  }

  setBounds(bounds: Box3, floorHeight: number): void {
    this.boundsRadius = bounds.getBoundingSphere(new Sphere()).radius;
    this.floorHeight = floorHeight;
    this.updateDistanceLimits();
  }

  jumpTo(pose: CameraPose): void {
    this.cancelTween();
    this.apply(pose);
    this.controls.update();
  }

  tweenTo(pose: CameraPose): void {
    const from = { position: this.camera.position, target: this.controls.target };
    this.tween = new CameraTween(from, pose);
    this.controls.enableDamping = false;
  }

  update(deltaSeconds: number): void {
    if (this.tween) this.advanceTween(deltaSeconds);
    this.controls.update(deltaSeconds);
    this.keepTargetAboveFloor();
  }

  dispose(): void {
    this.controls.removeEventListener('start', this.cancelTween);
    this.controls.dispose();
  }

  private readonly cancelTween = (): void => {
    if (!this.tween) return;
    this.tween = null;
    this.controls.enableDamping = true;
  };

  private advanceTween(deltaSeconds: number): void {
    const tween = this.tween;
    if (!tween) return;
    this.apply(tween.advance(deltaSeconds));
    if (tween.finished) this.cancelTween();
  }

  private apply(pose: CameraPose): void {
    this.camera.position.copy(pose.position);
    this.controls.target.copy(pose.target);
  }

  private updateDistanceLimits(): void {
    const { vertical, horizontal } = this.framing();
    const fitDistance = this.boundsRadius / Math.sin(Math.atan(Math.min(vertical, horizontal)));
    this.controls.minDistance = this.boundsRadius * CAMERA_MIN_DISTANCE_FACTOR;
    this.controls.maxDistance = fitDistance * CAMERA_MAX_DISTANCE_FACTOR;
  }

  private keepTargetAboveFloor(): void {
    const minimum = this.floorHeight + TARGET_FLOOR_MARGIN;
    const shortfall = minimum - this.controls.target.y;
    if (shortfall <= 0) return;
    this.controls.target.y += shortfall;
    this.camera.position.y += shortfall;
  }
}
