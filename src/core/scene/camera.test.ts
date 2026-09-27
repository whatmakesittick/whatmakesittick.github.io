import { describe, expect, it } from 'vitest';
import { CameraRig } from './camera';
import { CAMERA_FAR, CAMERA_MAX_POLAR, CAMERA_NEAR } from './constants';

function fakeCanvas(): HTMLElement {
  const root = new EventTarget();
  return Object.assign(new EventTarget(), {
    style: {},
    ownerDocument: root,
    getRootNode: () => root,
  }) as unknown as HTMLElement;
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
});
