import { describe, expect, it } from 'vitest';
import { toRadians } from '@core/math';
import { regionFromSpec } from '@core/scene/regions';
import { Vector3 } from 'three';
import { CRUISE_ALTITUDE, LAUNCH_POINT, LOITER, TARGET, missilePointAt } from '../model';
import { PRESETS } from '../state';
import type { ChaseTarget } from './assembly';
import {
  FIXED_VIEWS,
  FOLLOW_VIEWS,
  LAYOUT_REGIONS,
  cameraViews,
  followPose,
  isLayoutRegion,
} from './cameraViews';

const SLOPES = { vertical: 0.29, horizontal: 0.45 };

const CHASE: ChaseTarget = {
  position: [1000, 380, 0],
  heading: 0,
  span: 20.1,
  target: [1000, 0, 150],
};

function directionOf(view: keyof typeof FIXED_VIEWS): Vector3 {
  const { direction } = FIXED_VIEWS[view];
  return new Vector3(...(direction as readonly [number, number, number])).normalize();
}

describe('camera views', () => {
  const views = cameraViews(() => CHASE);

  it('offers every view the chapters ask for', () => {
    Object.values(PRESETS).forEach((preset) => expect(views[preset.camera]).toBeDefined());
  });

  it('follows the aircraft everywhere but the orbit and the strike', () => {
    (['chase', 'side', 'wide', 'nose'] as const).forEach((id) =>
      expect(views[id].follow, id).toBe(true),
    );
    (['orbit', 'strike'] as const).forEach((id) => expect(views[id].follow, id).toBeFalsy());
  });

  it('leaves the camera alone until the aircraft exists', () => {
    const empty = cameraViews(() => null);
    (['chase', 'side', 'wide', 'nose'] as const).forEach((id) => {
      const view = empty[id];
      expect('pose' in view && view.pose(SLOPES), id).toBeNull();
    });
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

  it('frames the wide view far out', () => {
    const wide = followPose(CHASE, FOLLOW_VIEWS.wide, SLOPES);
    expect(wide.position.distanceTo(wide.target)).toBeGreaterThan(8 * CHASE.span);
  });

  it('frames the whole loiter circle up to the cruise altitude for the orbit', () => {
    expect(FIXED_VIEWS.orbit.region).toBe('loiter');
    const box = regionFromSpec(LAYOUT_REGIONS.loiter);
    const [x, z] = LOITER.centre;
    [
      [x - LOITER.radius, CRUISE_ALTITUDE, z],
      [x + LOITER.radius, 0, z],
      [x, CRUISE_ALTITUDE, z - LOITER.radius],
      [x, CRUISE_ALTITUDE, z + LOITER.radius],
    ].forEach((point) => expect(box.containsPoint(new Vector3(...point))).toBe(true));
  });

  it('looks at the orbit from high above and behind the entry side', () => {
    const direction = directionOf('orbit');
    expect(direction.y).toBeGreaterThan(Math.sin(toRadians(45)));
    expect(direction.x).toBeLessThan(0);
    expect(direction.z).toBeLessThan(0);
  });

  it('keeps the whole missile flight in the strike lane', () => {
    expect(FIXED_VIEWS.strike.region).toBe('strikeLane');
    const box = regionFromSpec(LAYOUT_REGIONS.strikeLane);
    [0, 0.25, 0.5, 0.75, 1].forEach((share) =>
      expect(box.containsPoint(new Vector3(...missilePointAt(share))), String(share)).toBe(true),
    );
  });

  it('looks from behind the launch point toward the target, raised 25 degrees', () => {
    const direction = directionOf('strike');
    expect(Math.asin(direction.y)).toBeCloseTo(toRadians(25), 9);
    const away = new Vector3(
      LAUNCH_POINT[0] - TARGET[0],
      0,
      LAUNCH_POINT[2] - TARGET[2],
    ).normalize();
    const level = direction.clone().setY(0).normalize();
    expect(level.dot(away)).toBeCloseTo(1, 9);
  });

  it('resolves only the two layout regions itself', () => {
    expect(isLayoutRegion('loiter')).toBe(true);
    expect(isLayoutRegion('strikeLane')).toBe(true);
    (['scene', 'airfield', 'aircraft', 'target'] as const).forEach((id) =>
      expect(isLayoutRegion(id), id).toBe(false),
    );
  });
});
