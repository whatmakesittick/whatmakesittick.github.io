import { Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { CustomView, FramedView } from '@core/scene/cameraViews';
import type { RegionId } from '../ids';
import { PRESETS } from '../state';
import { FRONT_DISTANCE, VALVE_DISTANCE, VALVE_FRAMING, cameraViews } from './cameraViews';

const SLOPES = { vertical: 0.29, horizontal: 0.45 };

function anchorAt(x: number, y: number, z: number): Object3D {
  const anchor = new Object3D();
  anchor.position.set(x, y, z);
  anchor.updateMatrixWorld(true);
  return anchor;
}

describe('camera views', () => {
  it('offers every view the chapters ask for', () => {
    const views = cameraViews(() => null);
    Object.values(PRESETS).forEach((preset) => expect(views[preset.camera]).toBeDefined());
  });

  it('frames the regions the spec names from the front of the chest', () => {
    const views = cameraViews(() => null);
    const framed = (id: 'front' | 'section' | 'left' | 'septum' | 'whole') =>
      views[id] as FramedView<RegionId>;
    expect(framed('front')).toMatchObject({
      region: 'scene',
      margin: 1.02,
      distance: FRONT_DISTANCE,
    });
    expect(framed('section').region).toBe('chambers');
    expect(framed('left').region).toBe('leftHeart');
    expect(framed('septum').region).toBe('conduction');
    expect(framed('whole').region).toBe('scene');
    (['front', 'section', 'left', 'septum', 'whole'] as const).forEach((id) =>
      expect((framed(id).direction as readonly number[])[2], id).toBeGreaterThan(0),
    );
  });

  it('frames about 70 mm around the picked valve from the front, a little above and to the right', () => {
    const valve = anchorAt(21, 2, -1);
    const view = cameraViews(() => valve).valve as CustomView;
    const pose = view.pose(SLOPES);
    expect(view.follow).toBe('position');
    expect(view.distance).toEqual(VALVE_DISTANCE);
    expect(pose).not.toBeNull();
    if (!pose) return;
    expect(pose.target.distanceTo(valve.position)).toBeCloseTo(0);
    const offset = pose.position.clone().sub(pose.target);
    expect(offset.z).toBeGreaterThan(offset.x);
    expect(offset.x).toBeGreaterThan(offset.y);
    expect(offset.y).toBeGreaterThan(0);
    expect(offset.length()).toBeCloseTo(VALVE_FRAMING.spanMm / 2 / SLOPES.vertical);
    expect(offset.normalize().dot(new Vector3(...VALVE_FRAMING.direction).normalize())).toBeCloseTo(
      1,
    );
  });

  it('leaves the camera alone until the valve anchor exists', () => {
    expect((cameraViews(() => null).valve as CustomView).pose(SLOPES)).toBeNull();
  });
});
