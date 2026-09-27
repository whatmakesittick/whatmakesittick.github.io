import { Box3, Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CameraRig } from './camera';
import type { CameraOptions } from './camera';
import { CAMERA_FAR, CAMERA_MAX_POLAR, CAMERA_NEAR, CAMERA_TWEEN_SECONDS } from './constants';
import type { CameraPose } from './frameBox';
import { NO_SAFE_AREA } from './lens';
import type { ViewportSize } from './lens';

const FRAME_SECONDS = 1 / 60;
const CLOSE_UP: CameraPose = { position: new Vector3(0, 3, 4), target: new Vector3(0, 0, 0) };
const SIDE_VIEW: CameraPose = { position: new Vector3(4, 1, 0), target: new Vector3(0, 1, 0) };
const MOVE = new Vector3(3, 1, -2);
const BOUNDS = new Box3(new Vector3(-2, 0, -2), new Vector3(2, 4, 2));
const VIEWPORT: ViewportSize = { width: 800, height: 600, safe: NO_SAFE_AREA };
const SCENE_DISTANCE = { min: 3, max: 50 };
const VIEW_MIN_DISTANCE = 1;

function fakeCanvas(): HTMLElement {
  const root = new EventTarget();
  return Object.assign(new EventTarget(), {
    style: {},
    ownerDocument: root,
    getRootNode: () => root,
  }) as unknown as HTMLElement;
}

function expectPose(rig: CameraRig, pose: CameraPose, offset = new Vector3()): void {
  expect(rig.camera.position.distanceTo(pose.position.clone().add(offset))).toBeCloseTo(0);
  expect(rig.controls.target.distanceTo(pose.target.clone().add(offset))).toBeCloseTo(0);
}

function boundedRig(options: CameraOptions = {}): CameraRig {
  const rig = new CameraRig(fakeCanvas(), options);
  rig.setViewport(VIEWPORT);
  rig.setBounds(BOUNDS, 0);
  return rig;
}

function distanceLimits(rig: CameraRig): [min: number, max: number] {
  return [rig.controls.minDistance, rig.controls.maxDistance];
}

function followingRig(anchor: Object3D): CameraRig {
  const rig = new CameraRig(fakeCanvas());
  rig.follow(anchor);
  rig.jumpTo(CLOSE_UP);
  return rig;
}

describe('CameraRig', () => {
  it('uses the default camera planes and orbit limit', () => {
    const rig = new CameraRig(fakeCanvas());
    expect(rig.camera.near).toBe(CAMERA_NEAR);
    expect(rig.camera.far).toBe(CAMERA_FAR);
    expect(rig.controls.maxPolarAngle).toBe(CAMERA_MAX_POLAR);
    rig.dispose();
  });

  it('applies the camera planes and orbit limit an explainer asks for', () => {
    const rig = new CameraRig(fakeCanvas(), { near: 2, far: 9000, maxPolarAngle: 2 });
    expect(rig.camera.near).toBe(2);
    expect(rig.camera.far).toBe(9000);
    expect(rig.controls.maxPolarAngle).toBe(2);
    rig.dispose();
  });

  it('lets explicit distance limits win over the ones derived from the bounds', () => {
    const rig = boundedRig({ distance: SCENE_DISTANCE });
    expect(distanceLimits(rig)).toEqual([SCENE_DISTANCE.min, SCENE_DISTANCE.max]);
  });

  it('keeps a limit derived from the bounds when no explicit one is given', () => {
    const [, derivedMax] = distanceLimits(boundedRig());
    const rig = boundedRig({ distance: { min: SCENE_DISTANCE.min } });
    expect(distanceLimits(rig)).toEqual([SCENE_DISTANCE.min, derivedMax]);
  });

  it('puts view limits over the scene ones until they are cleared', () => {
    const rig = boundedRig({ distance: SCENE_DISTANCE });
    rig.setDistanceLimits({ min: VIEW_MIN_DISTANCE });
    expect(distanceLimits(rig)).toEqual([VIEW_MIN_DISTANCE, SCENE_DISTANCE.max]);
    rig.setDistanceLimits({});
    expect(distanceLimits(rig)).toEqual([SCENE_DISTANCE.min, SCENE_DISTANCE.max]);
  });

  it('keeps the framing fixed relative to a moving anchor', () => {
    const anchor = new Object3D();
    const rig = followingRig(anchor);
    anchor.position.copy(MOVE);
    rig.update(FRAME_SECONDS);
    expectPose(rig, CLOSE_UP, MOVE);
  });

  it('follows an anchor that moves with its parent', () => {
    const parent = new Object3D();
    const anchor = new Object3D();
    parent.add(anchor);
    const rig = followingRig(anchor);
    parent.position.copy(MOVE);
    rig.update(FRAME_SECONDS);
    expectPose(rig, CLOSE_UP, MOVE);
  });

  it('carries a camera tween along with the anchor', () => {
    const anchor = new Object3D();
    const rig = followingRig(anchor);
    rig.tweenTo(SIDE_VIEW);
    anchor.position.copy(MOVE);
    rig.update(CAMERA_TWEEN_SECONDS);
    expectPose(rig, SIDE_VIEW, MOVE);
  });

  it('takes a new pose as it is at the moment it is given', () => {
    const anchor = new Object3D();
    const rig = followingRig(anchor);
    anchor.position.copy(MOVE);
    rig.jumpTo(SIDE_VIEW);
    rig.update(FRAME_SECONDS);
    expectPose(rig, SIDE_VIEW);
  });

  it('does not shift when the same anchor is followed again', () => {
    const anchor = new Object3D();
    const rig = followingRig(anchor);
    anchor.position.copy(MOVE);
    rig.follow(anchor);
    rig.update(FRAME_SECONDS);
    expectPose(rig, CLOSE_UP);
  });

  it('stops following once the anchor is cleared', () => {
    const anchor = new Object3D();
    const rig = followingRig(anchor);
    rig.follow(null);
    anchor.position.copy(MOVE);
    rig.update(FRAME_SECONDS);
    expectPose(rig, CLOSE_UP);
  });
});
