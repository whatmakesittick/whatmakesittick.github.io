import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { toRadians } from '@core/math';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import { CAMERA_VIEW_IDS } from '../ids';
import type { ChaseTarget } from '../ids';
import { CAR, CAR_REGIONS } from '../model';
import { PRESETS } from '../state';
import {
  FIXED_VIEWS,
  FOLLOW_MODE,
  FOLLOW_VIEWS,
  cameraViews,
  carCentre,
  followPose,
} from './cameraViews';
import type { FollowView } from './cameraViews';

const PHONE: FramingSlopes = { vertical: 0.2, horizontal: 0.13 };
const DESKTOP: FramingSlopes = { vertical: 0.27, horizontal: 0.45 };
const MIN_FRAME_SHARE = 1 / 3;
const WORLD_UP = new Vector3(0, 1, 0);

const CHASE: ChaseTarget = {
  position: [10, 0, 0],
  heading: 0,
  pitch: 0,
  roll: 0,
  span: CAR.wheelbase,
};

const FOLLOW_IDS = Object.keys(FOLLOW_VIEWS) as FollowView[];

function offsetOf({ position, target }: CameraPose): Vector3 {
  return position.clone().sub(target);
}

function carCorners(): Vector3[] {
  const { x, y, z } = CAR_REGIONS.car;
  const lift = CHASE.position[1] + CAR.rideHeight;
  return x.flatMap((cx) =>
    y.flatMap((cy) => z.map((cz) => new Vector3(CHASE.position[0] + cx, lift + cy, cz))),
  );
}

function widthShare(pose: CameraPose, slopes: FramingSlopes): number {
  const forward = pose.target.clone().sub(pose.position).normalize();
  const right = new Vector3().crossVectors(forward, WORLD_UP).normalize();
  const spread = carCorners().map((corner) => {
    const toCorner = corner.sub(pose.position);
    return toCorner.dot(right) / toCorner.dot(forward);
  });
  return (Math.max(...spread) - Math.min(...spread)) / (2 * slopes.horizontal);
}

describe('camera views', () => {
  const views = cameraViews(() => CHASE);

  it('offers every camera view, including each one the chapters ask for', () => {
    expect(Object.keys(views).sort()).toEqual([...CAMERA_VIEW_IDS].sort());
    Object.values(PRESETS).forEach((preset) => expect(views[preset.camera]).toBeDefined());
  });

  it('rides along with the car in the follow views and stays put in the wide ones', () => {
    FOLLOW_IDS.forEach((id) => expect(views[id].follow, id).toBe(FOLLOW_MODE));
    expect(FOLLOW_MODE).toBe('position');
    expect(views.rampWide.follow).toBeUndefined();
    expect(views.siteWide.follow).toBeUndefined();
  });

  it('leaves the camera alone until the car exists', () => {
    const empty = cameraViews(() => null);
    FOLLOW_IDS.forEach((id) => {
      const view = empty[id];
      expect('pose' in view && view.pose(PHONE), id).toBeNull();
    });
  });

  it('aims at the middle of the body, also when the car is upside down', () => {
    const upright = carCentre(CHASE);
    expect(upright.toArray()).toEqual([10, CAR.rideHeight + CAR.height / 2, 0]);
    const inverted = carCentre({ ...CHASE, position: [40, 6, 0], roll: Math.PI });
    expect(inverted.x).toBeCloseTo(40, 9);
    expect(inverted.y).toBeCloseTo(6 - CAR.rideHeight - CAR.height / 2, 9);
    expect(followPose(CHASE, FOLLOW_VIEWS.boostSide, PHONE).target).toEqual(upright);
  });

  it('looks at the tank from the right front quarter, above the roof', () => {
    const offset = offsetOf(followPose(CHASE, FOLLOW_VIEWS.tankClose, PHONE));
    expect(offset.x).toBeGreaterThan(0);
    expect(offset.z).toBeGreaterThan(0);
    expect(Math.asin(offset.y / offset.length())).toBeCloseTo(toRadians(25), 9);
  });

  it('sees the rear nozzles from behind on the right and the roll from behind on the left', () => {
    const nozzle = offsetOf(followPose(CHASE, FOLLOW_VIEWS.nozzleClose, PHONE));
    expect(nozzle.x).toBeLessThan(0);
    expect(nozzle.z).toBeGreaterThan(0);
    const flip = offsetOf(followPose(CHASE, FOLLOW_VIEWS.flipChase, PHONE));
    expect(flip.x).toBeLessThan(0);
    expect(flip.z).toBeLessThan(0);
    expect(Math.asin(flip.y / flip.length())).toBeCloseTo(toRadians(18), 9);
  });

  it('watches the boost abeam from the tank side, close to the ground', () => {
    const offset = offsetOf(followPose(CHASE, FOLLOW_VIEWS.boostSide, PHONE));
    expect(Math.abs(offset.x)).toBeLessThan(1e-9);
    expect(offset.z).toBeGreaterThan(0);
    expect(Math.asin(offset.y / offset.length())).toBeCloseTo(toRadians(6), 9);
  });

  it('turns the bearing with the heading', () => {
    const turned = followPose({ ...CHASE, heading: Math.PI / 2 }, FOLLOW_VIEWS.boostSide, PHONE);
    const offset = offsetOf(turned);
    expect(offset.x).toBeLessThan(0);
    expect(Math.abs(offset.z)).toBeLessThan(1e-9);
  });

  it('fills at least a third of the width of a phone, its short side, with the car', () => {
    FOLLOW_IDS.forEach((id) =>
      expect(
        widthShare(followPose(CHASE, FOLLOW_VIEWS[id], PHONE), PHONE),
        id,
      ).toBeGreaterThanOrEqual(MIN_FRAME_SHARE),
    );
  });

  it('spans at least a third of the width of a desktop stage with the car', () => {
    FOLLOW_IDS.forEach((id) =>
      expect(
        widthShare(followPose(CHASE, FOLLOW_VIEWS[id], DESKTOP), DESKTOP),
        id,
      ).toBeGreaterThanOrEqual(MIN_FRAME_SHARE),
    );
  });

  it('backs off on a narrow stage so the car still fits the short side', () => {
    const phone = followPose(CHASE, FOLLOW_VIEWS.flipChase, PHONE);
    const desktop = followPose(CHASE, FOLLOW_VIEWS.flipChase, DESKTOP);
    const ratio = offsetOf(phone).length() / offsetOf(desktop).length();
    expect(ratio).toBeCloseTo(DESKTOP.vertical / PHONE.horizontal, 9);
  });

  it('frames the ramp arc and the whole site from the tank side, above the ground', () => {
    expect(FIXED_VIEWS.rampWide).toEqual({ region: 'arc', direction: [0.15, 0.3, 1], margin: 1.1 });
    expect(FIXED_VIEWS.siteWide).toEqual({
      region: 'site',
      direction: [0.2, 0.45, 1],
      margin: 1.05,
    });
  });
});
