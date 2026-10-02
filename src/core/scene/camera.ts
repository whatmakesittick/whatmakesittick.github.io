import { PerspectiveCamera, Quaternion, Sphere, Vector3 } from 'three';
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
import { Listeners } from './listeners';

const TARGET_FLOOR_MARGIN = 1;
const WORLD_UP = new Vector3(0, 1, 0);

export type FollowMode = 'position' | 'heading' | 'attitude';

function twistAboutUp(turn: Quaternion): Quaternion {
  turn.set(0, turn.y, 0, turn.w);
  return turn.lengthSq() > 0 ? turn.normalize() : turn.identity();
}

export interface CameraDistance {
  min?: number;
  max?: number;
}

export interface CameraOptions {
  near?: number;
  far?: number;
  maxPolarAngle?: number;
  distance?: CameraDistance;
  floorMargin?: number;
}

export class CameraRig {
  readonly camera: PerspectiveCamera;
  readonly controls: OrbitControls;
  private tween: CameraTween | null = null;
  private anchor: Object3D | null = null;
  private followMode: FollowMode = 'position';
  private readonly anchorPosition = new Vector3();
  private readonly anchorRotation = new Quaternion();
  private readonly followedPosition = new Vector3();
  private readonly followedRotation = new Quaternion();
  private readonly followShift = new Vector3();
  private readonly followTurn = new Quaternion();
  private floorHeight = -Infinity;
  private readonly floorMargin: number;
  private boundsRadius = 1;
  private readonly sceneDistance: CameraDistance;
  private distanceOverride: CameraDistance = {};
  private viewport: ViewportSize = { width: 1, height: 1, safe: NO_SAFE_AREA };
  private readonly changes = new Listeners<[]>();

  constructor(domElement: HTMLElement, options: CameraOptions = {}) {
    const {
      near = CAMERA_NEAR,
      far = CAMERA_FAR,
      maxPolarAngle = CAMERA_MAX_POLAR,
      floorMargin = TARGET_FLOOR_MARGIN,
    } = options;
    this.sceneDistance = options.distance ?? {};
    this.floorMargin = floorMargin;
    this.camera = new PerspectiveCamera(CAMERA_FOV, 1, near, far);
    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = CAMERA_DAMPING;
    this.controls.maxPolarAngle = maxPolarAngle;
    this.controls.screenSpacePanning = true;
    this.controls.addEventListener('start', this.cancelTween);
    this.controls.addEventListener('change', this.notifyChange);
  }

  onChange(listener: () => void): () => void {
    return this.changes.add(listener);
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
    this.notifyChange();
  }

  setDistanceLimits(limits: CameraDistance): void {
    this.distanceOverride = limits;
    this.updateDistanceLimits();
    this.notifyChange();
  }

  follow(anchor: Object3D | null, mode: FollowMode = 'position'): void {
    this.anchor = anchor;
    this.followMode = mode;
    this.camera.up.copy(WORLD_UP);
    this.syncAnchor();
    this.notifyChange();
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
    this.notifyChange();
  }

  update(deltaSeconds: number): void {
    this.followAnchor();
    if (this.tween) this.advanceTween(deltaSeconds);
    this.controls.update(deltaSeconds);
    this.keepTargetAboveFloor();
  }

  dispose(): void {
    this.controls.removeEventListener('start', this.cancelTween);
    this.controls.removeEventListener('change', this.notifyChange);
    this.changes.clear();
    this.controls.dispose();
  }

  private readonly notifyChange = (): void => this.changes.notify();

  private readonly cancelTween = (): void => {
    if (!this.tween) return;
    this.tween = null;
    this.controls.enableDamping = true;
  };

  private syncAnchor(): void {
    this.anchor?.getWorldPosition(this.anchorPosition);
    this.anchor?.getWorldQuaternion(this.anchorRotation);
  }

  private followAnchor(): void {
    if (!this.anchor) return;
    const position = this.anchor.getWorldPosition(this.followedPosition);
    const rotation = this.anchor.getWorldQuaternion(this.followedRotation);
    this.shift(this.followShift.subVectors(position, this.anchorPosition));
    this.turnWith(position, rotation);
    this.anchorPosition.copy(position);
    this.anchorRotation.copy(rotation);
  }

  private turnWith(pivot: Vector3, rotation: Quaternion): void {
    if (this.followMode === 'position') return;
    const turn = this.followTurn.copy(this.anchorRotation).invert().premultiply(rotation);
    if (this.followMode === 'heading') twistAboutUp(turn);
    this.rotateAbout(pivot, turn);
    if (this.followMode === 'attitude') this.camera.up.copy(WORLD_UP).applyQuaternion(rotation);
  }

  private rotateAbout(pivot: Vector3, turn: Quaternion): void {
    this.camera.position.sub(pivot).applyQuaternion(turn).add(pivot);
    this.controls.target.sub(pivot).applyQuaternion(turn).add(pivot);
    this.tween?.turn(pivot, turn);
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
    const minimum = this.floorHeight + this.floorMargin;
    const shortfall = minimum - this.controls.target.y;
    if (shortfall <= 0) return;
    this.controls.target.y += shortfall;
    this.camera.position.y += shortfall;
  }
}
