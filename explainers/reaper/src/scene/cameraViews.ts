import { Vector3 } from 'three';
import { toRadians } from '@core/math';
import type { CustomView, Direction, FramedView, ViewSpec } from '@core/scene/cameraViews';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import type { RegionSpec } from '@core/scene/regions';
import type { CameraView, Point, RegionId } from '../ids';
import { CRUISE_ALTITUDE, LAUNCH_POINT, LOITER, MISSILE_ARC_RISE, TARGET } from '../model';
import type { ChaseTarget } from './assembly';

export type ChaseSource = () => ChaseTarget | null;
export type LayoutRegionId = 'loiter' | 'strikeLane';
export type ViewRegionId = RegionId | LayoutRegionId;

type FollowView = Exclude<CameraView, 'strike' | 'orbit'>;
type FixedView = Extract<CameraView, 'strike' | 'orbit'>;

interface FollowSpec {
  bearing: number;
  elevation: number;
  spans: number;
  aimAhead: number;
  aimUp: number;
}

const LOITER_MARGIN = 30;
const LOITER_HEADROOM = 30;
const STRIKE_LANE_MARGIN = 20;
const STRIKE_LIFT = toRadians(25);

export const FOLLOW_VIEWS: Readonly<Record<FollowView, FollowSpec>> = {
  chase: { bearing: toRadians(-145), elevation: toRadians(14), spans: 1.7, aimAhead: 0, aimUp: 0 },
  side: { bearing: toRadians(90), elevation: toRadians(3), spans: 1.25, aimAhead: 0, aimUp: 0 },
  wide: {
    bearing: toRadians(160),
    elevation: toRadians(22),
    spans: 11,
    aimAhead: -50,
    aimUp: -25,
  },
  nose: {
    bearing: toRadians(-40),
    elevation: toRadians(-14),
    spans: 0.7,
    aimAhead: 4.6,
    aimUp: -0.95,
  },
};

function around(centre: number, reach: number): readonly [number, number] {
  return [centre - reach, centre + reach];
}

function between(a: number, b: number, margin: number): readonly [number, number] {
  return [Math.min(a, b) - margin, Math.max(a, b) + margin];
}

export const LAYOUT_REGIONS: Readonly<Record<LayoutRegionId, RegionSpec>> = {
  loiter: {
    x: around(LOITER.centre[0], LOITER.radius + LOITER_MARGIN),
    y: [0, CRUISE_ALTITUDE + LOITER_HEADROOM],
    z: around(LOITER.centre[1], LOITER.radius + LOITER_MARGIN),
  },
  strikeLane: {
    x: between(LAUNCH_POINT[0], TARGET[0], STRIKE_LANE_MARGIN),
    y: [TARGET[1], LAUNCH_POINT[1] + MISSILE_ARC_RISE],
    z: between(LAUNCH_POINT[2], TARGET[2], STRIKE_LANE_MARGIN),
  },
};

export function isLayoutRegion(id: ViewRegionId): id is LayoutRegionId {
  return id in LAYOUT_REGIONS;
}

function behindLaunch(): Direction {
  const away = Math.atan2(LAUNCH_POINT[2] - TARGET[2], LAUNCH_POINT[0] - TARGET[0]);
  const level = Math.cos(STRIKE_LIFT);
  return [level * Math.cos(away), Math.sin(STRIKE_LIFT), level * Math.sin(away)];
}

export const FIXED_VIEWS: Readonly<Record<FixedView, FramedView<ViewRegionId>>> = {
  orbit: { region: 'loiter', direction: [-0.55, 1.2, -0.45], margin: 1.05 },
  strike: { region: 'strikeLane', direction: behindLaunch(), margin: 1.15 },
};

function vectorOf(point: Point): Vector3 {
  return new Vector3(point[0], point[1], point[2]);
}

function direction(azimuth: number, elevation: number): Vector3 {
  const level = Math.cos(elevation);
  return new Vector3(level * Math.cos(azimuth), Math.sin(elevation), level * Math.sin(azimuth));
}

function fitDistance(width: number, slopes: FramingSlopes): number {
  return width / (2 * slopes.horizontal);
}

function aimPoint(chase: ChaseTarget, spec: FollowSpec): Vector3 {
  return vectorOf(chase.position)
    .add(direction(chase.heading, 0).multiplyScalar(spec.aimAhead))
    .add(new Vector3(0, spec.aimUp, 0));
}

export function followPose(
  chase: ChaseTarget,
  spec: FollowSpec,
  slopes: FramingSlopes,
): CameraPose {
  const aim = aimPoint(chase, spec);
  const distance = fitDistance(spec.spans * chase.span, slopes);
  const offset = direction(chase.heading + spec.bearing, spec.elevation).multiplyScalar(distance);
  return { position: aim.clone().add(offset), target: aim };
}

function followView(source: ChaseSource, spec: FollowSpec): CustomView {
  return {
    pose: (slopes) => {
      const chase = source();
      return chase ? followPose(chase, spec, slopes) : null;
    },
    follow: true,
  };
}

export function cameraViews(source: ChaseSource): Record<CameraView, ViewSpec<ViewRegionId>> {
  return {
    chase: followView(source, FOLLOW_VIEWS.chase),
    side: followView(source, FOLLOW_VIEWS.side),
    wide: followView(source, FOLLOW_VIEWS.wide),
    nose: followView(source, FOLLOW_VIEWS.nose),
    ...FIXED_VIEWS,
  };
}
