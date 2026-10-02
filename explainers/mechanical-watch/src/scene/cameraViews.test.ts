import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import type { CustomView, FramedView } from '@core/scene/cameraViews';
import type { RegionId } from '../ids';
import { mm } from '../model';
import { PRESETS } from '../state';
import { ANCHORED_VIEWS, cameraViews } from './cameraViews';

const SLOPES = { vertical: 0.29, horizontal: 0.45 };
const NO_ANCHORS = { wheel: () => null, fork: () => null };

function anchorAt(x: number, y: number, z: number): Object3D {
  const anchor = new Object3D();
  anchor.position.set(x, y, z);
  anchor.updateMatrixWorld(true);
  return anchor;
}

describe('camera views', () => {
  it('offers every view the chapters ask for', () => {
    const views = cameraViews(NO_ANCHORS);
    Object.values(PRESETS).forEach((preset) => expect(views[preset.camera]).toBeDefined());
  });

  it('lets the overview zoom out further than the close views', () => {
    const views = cameraViews(NO_ANCHORS);
    expect(views.movement.distance).toEqual({ min: 40, max: 1200 });
    (['barrel', 'wheel', 'escapement', 'balance', 'dialSide'] as const).forEach((id) =>
      expect(views[id].distance, id).toEqual({ min: 3, max: 600 }),
    );
  });

  it('looks at the back of the movement for the chapters and at the dial for the hands', () => {
    const views = cameraViews(NO_ANCHORS);
    const direction = (id: 'movement' | 'barrel' | 'balance' | 'dialSide') =>
      (views[id] as FramedView<RegionId>).direction as readonly number[];
    expect(direction('movement')[2]).toBeGreaterThan(0);
    expect(direction('barrel')[2]).toBeGreaterThan(0);
    expect(direction('balance')[2]).toBeGreaterThan(0);
    expect(direction('dialSide')[2]).toBeLessThan(0);
  });

  it('frames the picked wheel from behind the movement, a little above it, and follows it', () => {
    const wheel = anchorAt(20, -60, 12);
    const view = cameraViews({ ...NO_ANCHORS, wheel: () => wheel }).wheel as CustomView;
    const pose = view.pose(SLOPES);
    expect(view.follow).toBe('position');
    expect(pose).not.toBeNull();
    expect(pose!.target.distanceTo(wheel.position)).toBeCloseTo(0);
    expect(pose!.position.y).toBeGreaterThan(pose!.target.y);
    expect(pose!.position.z).toBeGreaterThan(pose!.target.z);
    expect(pose!.position.x).toBeLessThan(pose!.target.x);
    const offset = pose!.position.clone().sub(pose!.target);
    expect(offset.z).toBeGreaterThan(offset.y);
    const distance = pose!.position.distanceTo(pose!.target);
    expect(distance).toBeCloseTo(mm(ANCHORED_VIEWS.wheel.spanMm) / 2 / SLOPES.vertical);
  });

  it('frames the pallet fork from the other side without following it', () => {
    const fork = anchorAt(-40, -50, 24);
    const view = cameraViews({ ...NO_ANCHORS, fork: () => fork }).escapement as CustomView;
    const pose = view.pose(SLOPES);
    expect(view.follow).toBeUndefined();
    expect(pose!.position.x).toBeGreaterThan(pose!.target.x);
    expect(pose!.position.z).toBeGreaterThan(pose!.target.z);
  });

  it('leaves the camera alone until the anchors exist', () => {
    const views = cameraViews(NO_ANCHORS);
    expect((views.wheel as CustomView).pose(SLOPES)).toBeNull();
    expect((views.escapement as CustomView).pose(SLOPES)).toBeNull();
  });
});
