import { PerspectiveCamera, Sphere, Vector3 } from 'three';
import type { Box3, Object3D } from 'three';
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

export interface CameraDistance {
  min?: number;
  max?: number;
}

export interface CameraOptions {
  near?: number;
  far?: number;
  maxPolarAngle?: number;
  distance?: CameraDistance;
}

export class CameraRig {
  readonly camera: PerspectiveCamera;
  readonly controls: OrbitControls;
  private tween: CameraTween | null = null;
  private anchor: Object3D | null = null;
  private readonly anchorPosition = new Vector3();
  private readonly followedPosition = new Vector3();
  private readonly followShift = new Vector3();
  private floorHeight = -Infinity;
  private boundsRadius = 1;
  private readonly sceneDistance: CameraDistance;
  private distanceOverride: CameraDistance = {};
  private viewport: ViewportSize = { width: 1, height: 1, safe: NO_SAFE_AREA };

  constructor(domElement: HTMLElement, options: CameraOptions = {}) {
    const { near = CAMERA_NEAR, far = CAMERA_FAR, maxPolarAngle = CAMERA_MAX_POLAR } = options;
    this.sceneDistance = options.distance ?? {};
    this.camera = new PerspectiveCamera(CAMERA_FOV, 1, near, far);
    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = CAMERA_DAMPING;
    this.controls.maxPolarAngle = maxPolarAngle;
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

  setDistanceLimits(limits: CameraDistance): void {
    this.distanceOverride = limits;
    this.updateDistanceLimits();
  }

  follow(anchor: Object3D | null): void {
    this.anchor = anchor;
    this.syncAnchor();
  }

  jumpTo(pose: CameraPose): void {
    this.cancelTween();
    this.apply(pose);
    this.controls.update();
    this.syncAnchor();
  }

  tweenTo(pose: CameraPose): void {
    const from = { position: this.camera.position, target: this.controls.target };
    this.tween = new CameraTween(from, pose);
    this.controls.enableDamping = false;
    this.syncAnchor();
  }

  update(deltaSeconds: number): void {
    this.followAnchor();
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

  private syncAnchor(): void {
    this.anchor?.getWorldPosition(this.anchorPosition);
  }

  private followAnchor(): void {
    if (!this.anchor) return;
    const position = this.anchor.getWorldPosition(this.followedPosition);
    this.shift(this.followShift.subVectors(position, this.anchorPosition));
    this.anchorPosition.copy(position);
  }

  private shift(delta: Vector3): void {
    this.camera.position.add(delta);
    this.controls.target.add(delta);
    this.tween?.shift(delta);
  }

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
    const derived = this.boundsDistance();
    const { sceneDistance, distanceOverride } = this;
    this.controls.minDistance = distanceOverride.min ?? sceneDistance.min ?? derived.min;
    this.controls.maxDistance = distanceOverride.max ?? sceneDistance.max ?? derived.max;
  }

  private boundsDistance(): Required<CameraDistance> {
    const { vertical, horizontal } = this.framing();
    const fitDistance = this.boundsRadius / Math.sin(Math.atan(Math.min(vertical, horizontal)));
    return {
      min: this.boundsRadius * CAMERA_MIN_DISTANCE_FACTOR,
      max: fitDistance * CAMERA_MAX_DISTANCE_FACTOR,
    };
  }

  private keepTargetAboveFloor(): void {
    const minimum = this.floorHeight + TARGET_FLOOR_MARGIN;
    const shortfall = minimum - this.controls.target.y;
    if (shortfall <= 0) return;
    this.controls.target.y += shortfall;
    this.camera.position.y += shortfall;
  }
}
