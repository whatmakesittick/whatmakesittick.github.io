import { Vector3 } from 'three';
import { toRadians } from '@core/math';
import type { CustomView } from '@core/scene/cameraViews';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import type { CameraView, Point } from '../ids';
import type { ChaseTarget } from './assembly';

export type ChaseSource = () => ChaseTarget | null;

type HeadingView = Exclude<CameraView, 'strike'>;

interface FollowSpec {
  bearing: number;
  elevation: number;
  spans: number;
  aimAhead: number;
  aimUp: number;
  aimToTarget: number;
}

interface StrikeSpec {
  sideTurn: number;
  lift: number;
  spans: number;
  aimToTarget: number;
}

export const FOLLOW_VIEWS: Readonly<Record<HeadingView, FollowSpec>> = {
  chase: {
    bearing: toRadians(-145),
    elevation: toRadians(14),
    spans: 1.7,
    aimAhead: 0,
    aimUp: 0,
    aimToTarget: 0,
  },
  side: {
    bearing: toRadians(90),
    elevation: toRadians(3),
    spans: 1.25,
    aimAhead: 0,
    aimUp: 0,
    aimToTarget: 0,
  },
  wide: {
    bearing: toRadians(160),
    elevation: toRadians(26),
    spans: 30,
    aimAhead: -150,
    aimUp: -80,
    aimToTarget: 0,
  },
  nose: {
    bearing: toRadians(-40),
    elevation: toRadians(-14),
    spans: 0.7,
    aimAhead: 4.6,
    aimUp: -0.95,
    aimToTarget: 0,
  },
  orbit: {
    bearing: toRadians(180),
    elevation: toRadians(55),
    spans: 34,
    aimAhead: 0,
    aimUp: 0,
    aimToTarget: 0,
  },
};

export const STRIKE_VIEW: StrikeSpec = {
  sideTurn: toRadians(14),
  lift: toRadians(12),
  spans: 12,
  aimToTarget: 0.45,
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
    .lerp(vectorOf(chase.target), spec.aimToTarget)
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

export function strikePose(chase: ChaseTarget, slopes: FramingSlopes): CameraPose {
  const aircraft = vectorOf(chase.position);
  const target = vectorOf(chase.target);
  const away = aircraft.clone().sub(target);
  const azimuth = Math.atan2(away.z, away.x) + STRIKE_VIEW.sideTurn;
  const elevation = Math.atan2(away.y, Math.hypot(away.x, away.z)) + STRIKE_VIEW.lift;
  const distance = fitDistance(STRIKE_VIEW.spans * chase.span, slopes);
  return {
    position: aircraft.clone().add(direction(azimuth, elevation).multiplyScalar(distance)),
    target: aircraft.clone().lerp(target, STRIKE_VIEW.aimToTarget),
  };
}

function followView(
  source: ChaseSource,
  pose: (chase: ChaseTarget, slopes: FramingSlopes) => CameraPose,
): CustomView {
  return {
    pose: (slopes) => {
      const chase = source();
      return chase ? pose(chase, slopes) : null;
    },
    follow: true,
  };
}

export function cameraViews(source: ChaseSource): Record<CameraView, CustomView> {
  const headingView = (view: HeadingView) =>
    followView(source, (chase, slopes) => followPose(chase, FOLLOW_VIEWS[view], slopes));
  return {
    chase: headingView('chase'),
    side: headingView('side'),
    wide: headingView('wide'),
    nose: headingView('nose'),
    orbit: headingView('orbit'),
    strike: followView(source, strikePose),
  };
}
