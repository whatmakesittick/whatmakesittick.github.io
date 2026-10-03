import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { toRadians } from '@core/math';
import { PRESETS } from '../state';
import { BACKUP_SATELLITE_OFFSET, BOAT, SATELLITE_OFFSET, TRANSOM_X, skyPoint } from '../model';
import {
  EYE_VIEW,
  GROUP_VIEW,
  ORBIT_VIEWS,
  SKY_VIEW,
  VIEW_DISTANCE,
  cameraViews,
  eyeAim,
  eyePose,
  groupPose,
  orbitPose,
  skyPitch,
  skyPose,
} from './cameraViews';
import type { FollowTarget } from './cameraViews';
import { fitsView, vectorOf } from './viewFit';

const PHONE = { vertical: 0.2, horizontal: 0.27 };
const DESKTOP = { vertical: 0.25, horizontal: 0.42 };

const TARGET: FollowTarget = {
  position: [400, 0.2, -100],
  heading: 0,
  length: BOAT.length,
  ship: [1400, 0, -420],
  trim: 0,
};

function offsetOf(pose: { position: Vector3; target: Vector3 }): Vector3 {
  return pose.position.clone().sub(pose.target);
}

describe('camera views', () => {
  const views = cameraViews(() => TARGET);

  it('offers every view the chapters ask for, all following the boat', () => {
    Object.values(PRESETS).forEach((preset) => {
      expect(views[preset.camera]).toBeDefined();
      expect(views[preset.camera].follow, preset.camera).toBe(true);
    });
  });

  it('leaves the camera alone until the boat exists', () => {
    const empty = cameraViews(() => null);
    Object.values(empty).forEach((view) => expect(view.pose(PHONE)).toBeNull());
  });

  it('limits the zoom of the close views', () => {
    expect(views.stern.distance).toEqual({ min: 1.2, max: 30 });
    expect(views.waterline.distance).toEqual({ min: 4, max: 80 });
    expect(views.eye.distance).toEqual({ min: 5, max: 120 });
    expect(views.chase.distance).toBeUndefined();
    expect(VIEW_DISTANCE.sky).toBeUndefined();
  });

  it('chases from behind on the port quarter, 18 degrees up, 2.2 lengths wide', () => {
    const pose = orbitPose(TARGET, ORBIT_VIEWS.chase, PHONE);
    expect(pose.target.toArray()).toEqual([400, 0.4, -100]);
    const offset = offsetOf(pose);
    expect(offset.x).toBeLessThan(0);
    expect(offset.z).toBeLessThan(0);
    expect(Math.asin(offset.y / offset.length())).toBeCloseTo(toRadians(18), 9);
    expect(Math.atan2(offset.z, offset.x)).toBeCloseTo(toRadians(-150), 9);
    expect(offset.length()).toBeCloseTo((2.2 * BOAT.length) / (2 * PHONE.horizontal), 9);
  });

  it('turns the views with the heading', () => {
    const turned = orbitPose({ ...TARGET, heading: Math.PI / 2 }, ORBIT_VIEWS.waterline, PHONE);
    const offset = offsetOf(turned);
    expect(offset.x).toBeGreaterThan(0);
    expect(Math.abs(offset.z)).toBeLessThan(1e-9);
  });

  it('sits abeam to port just above the water for the waterline', () => {
    const pose = orbitPose(TARGET, ORBIT_VIEWS.waterline, DESKTOP);
    const offset = offsetOf(pose);
    expect(offset.z).toBeLessThan(0);
    expect(Math.abs(offset.x)).toBeLessThan(1e-9);
    expect(pose.position.y).toBeGreaterThan(TARGET.position[1]);
    expect(pose.position.y).toBeLessThan(TARGET.position[1] + 1);
  });

  it('aims at the pump axis behind the transom, dropping with the trim', () => {
    const level = orbitPose(TARGET, ORBIT_VIEWS.stern, PHONE);
    expect(level.target.x).toBeCloseTo(400 + TRANSOM_X - 0.15, 9);
    expect(level.target.y).toBeCloseTo(0.2 - 0.15, 9);
    const trimmed = orbitPose({ ...TARGET, trim: toRadians(4) }, ORBIT_VIEWS.stern, PHONE);
    expect(trimmed.target.y).toBeLessThan(level.target.y);
    expect(offsetOf(level).length()).toBeCloseTo(2.4 / (2 * PHONE.horizontal), 9);
  });

  it('looks from just behind the dome along the heading with the bow fairing low in the frame', () => {
    const pose = eyePose(TARGET, PHONE);
    expect(pose.position.toArray()).toEqual([400.75, 1.12, -100]);
    expect(pose.target.x).toBeCloseTo(440, 9);
    const window = vectorOf(EYE_VIEW.window).add(vectorOf(TARGET.position));
    const margin = 0.01;
    expect(fitsView(pose, [window], PHONE, EYE_VIEW.windowShare + margin)).toBe(true);
    expect(fitsView(pose, [window], PHONE, EYE_VIEW.windowShare - margin)).toBe(false);
    expect(eyeAim(DESKTOP)[1]).toBeGreaterThan(eyeAim(PHONE)[1]);
  });

  it('frames the boat and the formation behind it on the starboard quarter, looking ahead', () => {
    [PHONE, DESKTOP].forEach((slopes) => {
      const pose = groupPose(TARGET, slopes);
      expect(pose.target.x).toBeCloseTo(400 + GROUP_VIEW.aimAhead, 9);
      const offset = pose.position.clone().sub(vectorOf(TARGET.position));
      expect(offset.x).toBeLessThan(0);
      expect(offset.z).toBeGreaterThan(0);
      const companions = [-1, 1].map((side) => new Vector3(370, 0, -100 + side * 18));
      expect(fitsView(pose, [vectorOf(TARGET.position), ...companions], slopes, 0.9)).toBe(true);
    });
  });

  it('keeps the boat low in the sky view with both satellites up toward the top', () => {
    [PHONE, DESKTOP].forEach((slopes) => {
      const pose = skyPose(TARGET, slopes);
      const behind = pose.position.clone().sub(vectorOf(TARGET.position));
      expect(behind.x).toBeLessThan(-SKY_VIEW.back.min + 1);
      expect(-behind.x).toBeLessThanOrEqual(SKY_VIEW.back.max + 1);
      expect(pose.target.y).toBeGreaterThan(pose.position.y);
      expect(fitsView(pose, [vectorOf(TARGET.position)], slopes, 1)).toBe(true);
    });
    const satellites = [SATELLITE_OFFSET, BACKUP_SATELLITE_OFFSET].map((offset) =>
      vectorOf(skyPoint(TARGET.position, offset)),
    );
    expect(satellites.every((point) => point.y > 100)).toBe(true);
  });

  it('centres the sky view when everything fits, else puts the boat at the bottom', () => {
    expect(skyPitch([-0.05, 0.1], PHONE)).toBeCloseTo(0.025, 9);
    const low = -0.1;
    expect(skyPitch([low, 0.5], PHONE)).toBeCloseTo(
      low + Math.atan(PHONE.vertical * SKY_VIEW.fill),
      9,
    );
  });
});
