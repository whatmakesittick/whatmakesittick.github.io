import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { toRadians } from '@core/math';
import { PRESETS } from '../state';
import type { ChaseTarget } from './assembly';
import { FOLLOW_VIEWS, cameraViews, followPose, strikePose } from './cameraViews';

const SLOPES = { vertical: 0.29, horizontal: 0.45 };

const CHASE: ChaseTarget = {
  position: [1000, 380, 0],
  heading: 0,
  span: 20.1,
  target: [1000, 0, 150],
};

describe('camera views', () => {
  it('offers every view the chapters ask for and follows the aircraft in all of them', () => {
    const views = cameraViews(() => CHASE);
    Object.values(PRESETS).forEach((preset) => {
      expect(views[preset.camera]).toBeDefined();
      expect(views[preset.camera].follow).toBe(true);
    });
  });

  it('leaves the camera alone until the aircraft exists', () => {
    const views = cameraViews(() => null);
    Object.values(views).forEach((view) => expect(view.pose(SLOPES)).toBeNull());
  });

  it('chases from behind, off the tail and above, looking at the aircraft', () => {
    const { position, target } = followPose(CHASE, FOLLOW_VIEWS.chase, SLOPES);
    expect(target.toArray()).toEqual([1000, 380, 0]);
    const offset = position.clone().sub(target);
    expect(offset.x).toBeLessThan(0);
    expect(offset.z).toBeLessThan(0);
    expect(Math.asin(offset.y / offset.length())).toBeCloseTo(toRadians(14), 9);
    expect(Math.atan2(-offset.z, -offset.x)).toBeCloseTo(toRadians(35), 9);
  });

  it('turns with the heading', () => {
    const turned = followPose({ ...CHASE, heading: Math.PI / 2 }, FOLLOW_VIEWS.side, SLOPES);
    const offset = turned.position.clone().sub(turned.target);
    expect(offset.x).toBeLessThan(0);
    expect(Math.abs(offset.z)).toBeLessThan(1e-9);
  });

  it('sits abeam on the right wing for the side view', () => {
    const { position, target } = followPose(CHASE, FOLLOW_VIEWS.side, SLOPES);
    const offset = position.clone().sub(target);
    expect(offset.z).toBeGreaterThan(0);
    expect(Math.abs(offset.x)).toBeLessThan(1e-9);
  });

  it('looks up at the sensor ball from ahead, below and to the left', () => {
    const { position, target } = followPose(CHASE, FOLLOW_VIEWS.nose, SLOPES);
    expect(target.x).toBeCloseTo(1004.6, 9);
    expect(target.y).toBeCloseTo(379.05, 9);
    const offset = position.clone().sub(target);
    expect(offset.x).toBeGreaterThan(0);
    expect(offset.y).toBeLessThan(0);
    expect(offset.z).toBeLessThan(0);
    expect(offset.length()).toBeLessThan(CHASE.span);
  });

  it('frames the wide and orbit views far out, the orbit from high above', () => {
    const wide = followPose(CHASE, FOLLOW_VIEWS.wide, SLOPES);
    const orbit = followPose(CHASE, FOLLOW_VIEWS.orbit, SLOPES);
    expect(wide.position.distanceTo(wide.target)).toBeGreaterThan(20 * CHASE.span);
    const high = orbit.position.clone().sub(orbit.target);
    expect(high.y / high.length()).toBeGreaterThan(Math.sin(toRadians(45)));
  });

  it('looks along the line from the aircraft to the target for the strike', () => {
    const { position, target } = strikePose(CHASE, SLOPES);
    const aircraft = new Vector3(...CHASE.position);
    const toTarget = new Vector3(...CHASE.target).sub(aircraft).normalize();
    const look = target.clone().sub(position).normalize();
    expect(look.dot(toTarget)).toBeGreaterThan(Math.cos(toRadians(25)));
    expect(position.y).toBeGreaterThan(aircraft.y);
    expect(position.z).toBeLessThan(aircraft.z);
  });
});
