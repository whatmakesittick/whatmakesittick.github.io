import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { FramingSlopes } from '@core/scene/lens';
import { PRESETS } from '../state';
import {
  FRAMED_VIEWS,
  PROBE_DISTANCE,
  SHIP_DISTANCE,
  cameraViews,
  probePose,
  shipPose,
} from './cameraViews';

const SLOPES: FramingSlopes = { vertical: 0.3, horizontal: 0.45 };
const ANCHORS = { probe: new Vector3(4, 3, 0), ship: new Vector3(16, 12, 0) };

function customPose(view: 'probe' | 'ship', anchors: typeof ANCHORS | null) {
  const spec = cameraViews(() => anchors)[view];
  if (!('pose' in spec)) throw new Error(`${view} is not a custom view`);
  return { spec, pose: spec.pose(SLOPES) };
}

describe('camera views', () => {
  it('offers every view the chapters ask for', () => {
    const views = cameraViews(() => ANCHORS);
    Object.values(PRESETS).forEach((preset) => expect(views[preset.camera]).toBeDefined());
  });

  it('frames the regions the spec names from the near side', () => {
    expect(FRAMED_VIEWS.hero.region).toBe('system');
    expect(FRAMED_VIEWS.lens.region).toBe('hole');
    expect(FRAMED_VIEWS.sheet.region).toBe('sheet');
    Object.values(FRAMED_VIEWS).forEach((view) =>
      expect((view.direction as readonly number[])[2]).toBeGreaterThan(0),
    );
    expect((FRAMED_VIEWS.sheet.direction as readonly number[])[1]).toBeGreaterThan(0.9);
  });

  it('sits the probe camera 2.6 units from the probe and follows it', () => {
    const { spec, pose } = customPose('probe', ANCHORS);
    expect(spec.follow).toBe('position');
    expect(spec.distance).toEqual(PROBE_DISTANCE);
    expect(pose?.target).toEqual(ANCHORS.probe);
    expect(pose?.position.distanceTo(ANCHORS.probe)).toBeCloseTo(2.6, 5);
    expect(probePose(ANCHORS).position.z).toBeGreaterThan(0);
  });

  it('looks from the ship at the probe without following', () => {
    const { spec, pose } = customPose('ship', ANCHORS);
    expect(spec.follow).toBeUndefined();
    expect(spec.distance).toEqual(SHIP_DISTANCE);
    expect(pose).toEqual(shipPose(ANCHORS));
    expect(pose?.position).toEqual(ANCHORS.ship);
    expect(pose?.target).toEqual(ANCHORS.probe);
  });

  it('leaves the camera alone while nothing is built', () => {
    expect(customPose('probe', null).pose).toBeNull();
    expect(customPose('ship', null).pose).toBeNull();
  });
});
