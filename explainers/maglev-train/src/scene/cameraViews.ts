import { Vector3 } from 'three';
import { toRadians } from '@core/math';
import type { FollowMode } from '@core/scene/camera';
import type { CustomView, Direction, FramedView, ViewSpec } from '@core/scene/cameraViews';
import { frameBox } from '@core/scene/frameBox';
import type { CameraPose } from '@core/scene/frameBox';
import { regionFromSpec } from '@core/scene/regions';
import type { RegionSpec } from '@core/scene/regions';
import type { CameraView, ChaseTarget, Point, RegionId } from '../ids';
import { ARM_ANCHOR, INSET_CENTRE, LIFT_TRAVEL_MM, REGION_SPECS } from '../model';
import { WHEEL_RAIL } from './parts/lineUp/constants';
import { chaseTargetFor } from './pose';

export type ChaseSource = () => ChaseTarget | null;

export type FollowView = Extract<CameraView, 'ride' | 'wave' | 'rear'>;
export type FixedView = Exclude<CameraView, FollowView>;
export type RegionView = Exclude<FixedView, 'lineUp'>;

export interface FollowSpec {
  aim: Point;
  bearing: number;
  elevation: number;
  distance: number;
}

export interface BoxSpec {
  box: RegionSpec;
  direction: Direction;
  margin: number;
}

export const FOLLOW_MODE: FollowMode = 'position';

function midpoint(from: Point, to: Point): Point {
  return [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
}

export const WAVE_AIM: Point = midpoint(ARM_ANCHOR, INSET_CENTRE);

export const FOLLOW_VIEWS: Readonly<Record<FollowView, FollowSpec>> = {
  ride: { aim: [60, 12, 0], bearing: toRadians(-12), elevation: toRadians(5), distance: 62 },
  wave: { aim: WAVE_AIM, bearing: toRadians(-60), elevation: toRadians(-15), distance: 22 },
  rear: { aim: [-62, 11, 0], bearing: toRadians(172), elevation: toRadians(12), distance: 52 },
};

export const REGION_VIEWS: Readonly<Record<RegionView, FramedView<RegionId>>> = {
  arm: { region: 'arm', direction: [0.12, -0.3, -1], margin: 1.12 },
  section: { region: 'crossSection', direction: [1, 0.14, -0.15], margin: 1.28 },
};

const LINE_UP_REGION = REGION_SPECS.lineUp;

export const WHEEL_RAIL_TOP =
  WHEEL_RAIL.bottom + WHEEL_RAIL.outline.height + WHEEL_RAIL.pantograph.headLift;

export const LINE_UP_VIEW: BoxSpec = {
  box: { ...LINE_UP_REGION, y: [LINE_UP_REGION.y[0], WHEEL_RAIL_TOP] },
  direction: [1, 0.12, 0],
  margin: 1.05,
};

const UP = new Vector3(0, 1, 0);
const FLOATING_CENTRE = new Vector3(...chaseTargetFor({ liftMm: LIFT_TRAVEL_MM }).position);

function direction(azimuth: number, elevation: number): Vector3 {
  const level = Math.cos(elevation);
  return new Vector3(level * Math.cos(azimuth), Math.sin(elevation), level * Math.sin(azimuth));
}

export function aimPoint({ position, heading }: ChaseTarget, aim: Point): Vector3 {
  return new Vector3(...aim)
    .sub(FLOATING_CENTRE)
    .applyAxisAngle(UP, -heading)
    .add(new Vector3(...position));
}

export function followPose(chase: ChaseTarget, spec: FollowSpec): CameraPose {
  const target = aimPoint(chase, spec.aim);
  const away = direction(chase.heading + spec.bearing, spec.elevation);
  return { position: target.clone().addScaledVector(away, spec.distance), target };
}

function followView(source: ChaseSource, spec: FollowSpec): CustomView {
  return {
    pose: () => {
      const chase = source();
      return chase ? followPose(chase, spec) : null;
    },
    follow: FOLLOW_MODE,
  };
}

function boxView({ box, direction: towards, margin }: BoxSpec): CustomView {
  const framed = regionFromSpec(box);
  const facing = new Vector3(...towards).normalize();
  return { pose: (slopes) => frameBox(framed, facing, slopes, margin) };
}

export function cameraViews(source: ChaseSource): Record<CameraView, ViewSpec<RegionId>> {
  return {
    ride: followView(source, FOLLOW_VIEWS.ride),
    wave: followView(source, FOLLOW_VIEWS.wave),
    rear: followView(source, FOLLOW_VIEWS.rear),
    ...REGION_VIEWS,
    lineUp: boxView(LINE_UP_VIEW),
  };
}
