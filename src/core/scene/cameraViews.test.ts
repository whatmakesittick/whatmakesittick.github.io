import { Box3, Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CameraViews } from './cameraViews';
import type { ViewRig, ViewSpec } from './cameraViews';
import { frameBox } from './frameBox';
import type { CameraPose } from './frameBox';
import type { FramingSlopes } from './lens';

type View = 'front' | 'side' | 'chase';
type Region = 'body';
type Call = readonly [name: string, value: unknown];

const SLOPES: FramingSlopes = { vertical: 0.3, horizontal: 0.5 };
const BODY = new Box3(new Vector3(-1, 0, -2), new Vector3(1, 2, 2));
const FRONT_MARGIN = 1.1;
const CHASE_POSE: CameraPose = { position: new Vector3(0, 2, 5), target: new Vector3() };
const CHASE_DISTANCE = { min: 1 };
const VIEWS: Record<View, ViewSpec<Region>> = {
  front: { region: 'body', direction: [0, 0, 1], margin: FRONT_MARGIN },
  side: { region: 'body', direction: { single: [1, 0, 0], wide: [0, 1, 0] }, margin: 1 },
  chase: { pose: () => CHASE_POSE, follow: true, distance: CHASE_DISTANCE },
};

interface Harness {
  views: CameraViews<View, Region>;
  calls: Call[];
  anchor: Object3D;
}

function createHarness(region: Box3 | null = BODY): Harness {
  const calls: Call[] = [];
  const rig: ViewRig = {
    framing: () => SLOPES,
    follow: (anchor) => calls.push(['follow', anchor]),
    setDistanceLimits: (limits) => calls.push(['distance', limits]),
    jumpTo: (pose) => calls.push(['jumpTo', pose]),
    tweenTo: (pose) => calls.push(['tweenTo', pose]),
  };
  const anchor = new Object3D();
  const views = new CameraViews<View, Region>(rig, {
    views: VIEWS,
    region: () => region?.clone() ?? null,
    anchor: () => anchor,
  });
  return { views, calls, anchor };
}

function lookDirection(pose: CameraPose | null): number[] {
  if (!pose) throw new Error('Expected a pose');
  return pose.position.clone().sub(pose.target).normalize().toArray();
}

describe('CameraViews', () => {
  it('fits the region along the view direction', () => {
    const { views } = createHarness();
    const expected = frameBox(BODY, new Vector3(0, 0, 1), SLOPES, FRONT_MARGIN);
    expect(views.pose('front')).toEqual(expected);
  });

  it('picks the direction of the variant', () => {
    const { views } = createHarness();
    expect(lookDirection(views.pose('side', 'single'))).toEqual([1, 0, 0]);
    expect(lookDirection(views.pose('side', 'wide'))).toEqual([0, 1, 0]);
  });

  it('refuses a variant without a direction', () => {
    const { views } = createHarness();
    expect(() => views.pose('side', 'tall')).toThrow('tall');
  });

  it('asks a custom view for its pose', () => {
    const { views } = createHarness();
    expect(views.pose('chase')).toBe(CHASE_POSE);
  });

  it('follows the anchor and applies the distance limits of the view', () => {
    const { views, calls, anchor } = createHarness();
    views.frame('chase', true);
    expect(calls).toEqual([
      ['follow', anchor],
      ['distance', CHASE_DISTANCE],
      ['tweenTo', CHASE_POSE],
    ]);
  });

  it('stops following and clears the distance limits for a plain view', () => {
    const { views, calls } = createHarness();
    views.frame('front', false);
    expect(calls).toEqual([
      ['follow', null],
      ['distance', {}],
      ['jumpTo', views.pose('front')],
    ]);
  });

  it('leaves the camera alone while there is nothing to frame', () => {
    const { views, calls } = createHarness(null);
    views.frame('front', true);
    expect(views.pose('front')).toBeNull();
    expect(calls).toEqual([]);
  });
});
