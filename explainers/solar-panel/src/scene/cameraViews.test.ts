import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { CustomView, FramedView } from '@core/scene/cameraViews';
import type { RegionId } from '../ids';
import { SUN_ARC_RADIUS_CM, SUN_DISC_RADIUS_CM } from '../model';
import { PRESETS } from '../state';
import {
  CLOSE_DISTANCE,
  SKY_VIEW,
  WIDE_DISTANCE,
  cameraViews,
  skyPose,
  sunArcBox,
} from './cameraViews';

const WIDE_SLOPES = { vertical: 0.29, horizontal: 0.52 };
const NARROW_SLOPES = { vertical: 0.29, horizontal: 0.12 };
const ARRAY = new Box3(new Vector3(-175, 0, -110), new Vector3(175, 120, 60));

describe('camera views', () => {
  it('offers every view the chapters ask for', () => {
    const views = cameraViews(() => null);
    Object.values(PRESETS).forEach((preset) => expect(views[preset.camera]).toBeDefined());
  });

  it('lets the roof and sky views zoom out further than the close views', () => {
    const views = cameraViews(() => null);
    expect(views.roof.distance).toEqual(WIDE_DISTANCE);
    expect(views.sky.distance).toEqual(WIDE_DISTANCE);
    (['stack', 'cell', 'strings', 'inverter'] as const).forEach((id) =>
      expect(views[id].distance, id).toEqual(CLOSE_DISTANCE),
    );
  });

  it('frames the panel along its face for the strings', () => {
    const strings = cameraViews(() => null).strings as FramedView<RegionId>;
    expect(strings).toMatchObject({ region: 'panel', direction: [0.15, 0.82, 0.57] });
  });

  it('leaves the camera alone until the array exists', () => {
    const sky = cameraViews(() => null).sky as CustomView;
    expect(sky.pose(WIDE_SLOPES)).toBeNull();
  });

  it('spans the sun arc from the eastern to the western horizon', () => {
    const arc = sunArcBox(new Vector3(0, 0, 0));
    const reach = SUN_ARC_RADIUS_CM + SUN_DISC_RADIUS_CM;
    expect(arc.max.x).toBeCloseTo(reach, 0);
    expect(arc.min.x).toBeCloseTo(-reach, 0);
    const noonHeight = SUN_ARC_RADIUS_CM * Math.sin((50 * Math.PI) / 180);
    expect(arc.max.y).toBeCloseTo(noonHeight + SUN_DISC_RADIUS_CM, 0);
    expect(arc.max.z).toBeGreaterThan(0);
  });

  it('looks south from low on the terrace north of the array with the arc above the panels', () => {
    const pose = skyPose(ARRAY, WIDE_SLOPES);
    expect(pose.position.z).toBeLessThan(ARRAY.min.z);
    expect(pose.target.z).toBeGreaterThan(pose.position.z);
    expect(pose.target.y).toBeGreaterThan(ARRAY.max.y);
    const offset = pose.position.clone().sub(pose.target).normalize();
    expect(offset.y).toBeLessThan(0.35);
  });

  it('aims closer to the panels on a short stage', () => {
    const tall = skyPose(ARRAY, WIDE_SLOPES);
    const short = skyPose(ARRAY, { vertical: 0.15, horizontal: 0.3 });
    expect(short.target.y).toBeLessThan(tall.target.y);
    expect(short.target.y).toBeGreaterThan(ARRAY.min.y);
  });

  it('keeps the camera inside the sky on a narrow screen', () => {
    const pose = skyPose(ARRAY, NARROW_SLOPES);
    expect(pose.position.distanceTo(pose.target)).toBeCloseTo(SKY_VIEW.maxDistance);
  });

  it('aims between the panels and the noon sun', () => {
    const pose = skyPose(ARRAY, WIDE_SLOPES);
    expect(pose.target.y).toBeGreaterThan(ARRAY.max.y);
    expect(pose.target.y).toBeLessThan(SUN_ARC_RADIUS_CM * Math.sin((50 * Math.PI) / 180));
    expect(pose.target.x).toBeCloseTo(0);
  });
});
