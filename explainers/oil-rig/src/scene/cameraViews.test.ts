import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import type { CustomView } from '@core/scene/cameraViews';
import { PRESETS } from '../state';
import { cameraViews } from './cameraViews';

const SLOPES = { vertical: 0.29, horizontal: 0.45 };

describe('camera views', () => {
  it('offers every view the chapters ask for', () => {
    const views = cameraViews(() => null);
    Object.values(PRESETS).forEach((preset) => expect(views[preset.camera]).toBeDefined());
  });

  it('rides above and beside the bit on the cut-face side and follows it', () => {
    const bit = new Object3D();
    bit.position.set(0, -300, 0);
    const view = cameraViews(() => bit).bit as CustomView;
    const pose = view.pose(SLOPES);
    expect(view.follow).toBe('position');
    expect(pose).not.toBeNull();
    expect(pose!.position.z).toBeGreaterThan(0);
    expect(pose!.position.x).toBeGreaterThan(0);
    expect(pose!.position.y).toBeGreaterThan(pose!.target.y);
    expect(pose!.target.y).toBeGreaterThan(-300);
    expect(pose!.target.distanceTo(bit.position)).toBeLessThan(10);
  });

  it('leaves the camera alone until the bit exists', () => {
    expect((cameraViews(() => null).bit as CustomView).pose(SLOPES)).toBeNull();
  });
});
