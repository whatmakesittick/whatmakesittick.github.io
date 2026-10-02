import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { toRadians } from '@core/math';
import { regionFromSpec } from '@core/scene/regions';
import { DRONE, ROUTE_BOUNDS, droneUnits } from '../model';
import { PRESETS } from '../state';
import type { ChaseTarget } from './assembly';
import {
  CAMERA_OFFSET,
  FIXED_VIEWS,
  FOLLOW_VIEWS,
  cameraViews,
  followPose,
  fpvPose,
} from './cameraViews';

const SLOPES = { vertical: 0.29, horizontal: 0.45 };

const CHASE: ChaseTarget = {
  position: [200, 40, 0],
  heading: 0,
  pitch: 0,
  roll: 0,
  span: droneUnits(DRONE.wheelbase),
};

describe('camera views', () => {
  const views = cameraViews(() => CHASE);

  it('offers every view the chapters ask for', () => {
    Object.values(PRESETS).forEach((preset) => expect(views[preset.camera]).toBeDefined());
  });

  it('follows the drone everywhere but the pilot view', () => {
    (['chase', 'top', 'close', 'side', 'fpv'] as const).forEach((id) =>
      expect(views[id].follow, id).toBe(true),
    );
    expect(views.pilot.follow).toBeFalsy();
  });

  it('leaves the camera alone until the drone exists', () => {
    const empty = cameraViews(() => null);
    (['chase', 'top', 'close', 'side', 'fpv'] as const).forEach((id) => {
      const view = empty[id];
      expect('pose' in view && view.pose(SLOPES), id).toBeNull();
    });
  });

  it('chases from behind and above, looking at the drone', () => {
    const { position, target } = followPose(CHASE, FOLLOW_VIEWS.chase, SLOPES);
    expect(target.toArray()).toEqual([200, 40, 0]);
    const offset = position.clone().sub(target);
    expect(offset.x).toBeLessThan(0);
    expect(offset.y).toBeGreaterThan(0);
    expect(Math.asin(offset.y / offset.length())).toBeCloseTo(toRadians(18), 9);
  });

  it('looks almost straight down for the top view and abeam for the side view', () => {
    const top = followPose(CHASE, FOLLOW_VIEWS.top, SLOPES);
    const down = top.position.clone().sub(top.target).normalize();
    expect(down.y).toBeGreaterThan(Math.sin(toRadians(75)));
    const side = followPose(CHASE, FOLLOW_VIEWS.side, SLOPES);
    const abeam = side.position.clone().sub(side.target);
    expect(abeam.z).toBeGreaterThan(0);
    expect(Math.abs(abeam.x)).toBeLessThan(1e-9);
  });

  it('turns with the heading', () => {
    const turned = followPose({ ...CHASE, heading: Math.PI / 2 }, FOLLOW_VIEWS.side, SLOPES);
    const offset = turned.position.clone().sub(turned.target);
    expect(offset.x).toBeLessThan(0);
    expect(Math.abs(offset.z)).toBeLessThan(1e-9);
  });

  it('frames the close view nearer than the chase view', () => {
    const close = followPose(CHASE, FOLLOW_VIEWS.close, SLOPES);
    const chase = followPose(CHASE, FOLLOW_VIEWS.chase, SLOPES);
    expect(close.position.distanceTo(close.target)).toBeLessThan(
      chase.position.distanceTo(chase.target),
    );
  });

  it('backs off further when the stage is wider than it is tall', () => {
    const wide = { vertical: 0.15, horizontal: 0.45 };
    const close = followPose(CHASE, FOLLOW_VIEWS.close, SLOPES);
    const squat = followPose(CHASE, FOLLOW_VIEWS.close, wide);
    expect(squat.position.distanceTo(squat.target)).toBeCloseTo(
      (close.position.distanceTo(close.target) * SLOPES.vertical) / wide.vertical,
    );
  });

  it('puts the fpv eye at the camera, looking ahead and up by the camera tilt', () => {
    const { position, target } = fpvPose(CHASE);
    expect(position.toArray()).toEqual([
      CHASE.position[0] + CAMERA_OFFSET[0],
      CHASE.position[1] + CAMERA_OFFSET[1],
      CHASE.position[2] + CAMERA_OFFSET[2],
    ]);
    const look = target.clone().sub(position).normalize();
    expect(Math.asin(look.y)).toBeCloseTo(DRONE.cameraTilt, 9);
    expect(look.x).toBeGreaterThan(0);
  });

  it('keeps the fpv camera on the nose when the drone pitches forward', () => {
    const pitched = fpvPose({ ...CHASE, pitch: toRadians(30) });
    const look = pitched.target.clone().sub(pitched.position).normalize();
    expect(Math.asin(look.y)).toBeCloseTo(DRONE.cameraTilt - toRadians(30), 9);
    expect(pitched.position.y).toBeLessThan(CHASE.position[1] + CAMERA_OFFSET[1]);
    const turned = fpvPose({ ...CHASE, heading: Math.PI / 2 });
    expect(turned.position.z).toBeGreaterThan(CHASE.position[2]);
  });

  it('frames the route for the pilot from behind the station, slightly above', () => {
    expect(FIXED_VIEWS.pilot.region).toBe('route');
    const direction = new Vector3(
      ...(FIXED_VIEWS.pilot.direction as readonly [number, number, number]),
    ).normalize();
    expect(direction.x).toBeLessThan(-0.9);
    expect(direction.y).toBeGreaterThan(0);
    expect(regionFromSpec(ROUTE_BOUNDS).isEmpty()).toBe(false);
  });
});
