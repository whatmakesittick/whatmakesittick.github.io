import { Vector3 } from 'three';
import { toRadians } from '@core/math';
import type { FollowMode } from '@core/scene/camera';
import type { CustomView, FramedView, ViewSpec } from '@core/scene/cameraViews';
import type { CameraPose } from '@core/scene/frameBox';
import type { CameraView, ChaseTarget, Point, RegionId } from '../ids';
import { ARM_ANCHOR, LIFT_TRAVEL_MM } from '../model';
import { chaseTargetFor } from './pose';

export type ChaseSource = () => ChaseTarget | null;

export type FollowView = Extract<CameraView, 'ride' | 'wave' | 'rear'>;
export type FixedView = Exclude<CameraView, FollowView>;

export interface FollowSpec {
  aim: Point;
  bearing: number;
  elevation: number;
  distance: number;
}

export const FOLLOW_MODE: FollowMode = 'position';

export const FOLLOW_VIEWS: Readonly<Record<FollowView, FollowSpec>> = {
  ride: { aim: [58, 12, 0], bearing: toRadians(-12), elevation: toRadians(5), distance: 70 },
  wave: { aim: ARM_ANCHOR, bearing: toRadians(-70), elevation: toRadians(-4), distance: 25 },
  rear: { aim: [-55, 11.5, 0], bearing: toRadians(172), elevation: toRadians(10), distance: 80 },
};

export const FIXED_VIEWS: Readonly<Record<FixedView, FramedView<RegionId>>> = {
  arm: { region: 'arm', direction: [0.12, -0.16, -1], margin: 1.15 },
  section: { region: 'crossSection', direction: [1, 0.12, -0.18], margin: 1.15 },
  lineUp: { region: 'lineUp', direction: [1, 0.12, 0], margin: 1.05 },
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

export function cameraViews(source: ChaseSource): Record<CameraView, ViewSpec<RegionId>> {
  return {
    ride: followView(source, FOLLOW_VIEWS.ride),
    wave: followView(source, FOLLOW_VIEWS.wave),
    rear: followView(source, FOLLOW_VIEWS.rear),
    ...FIXED_VIEWS,
  };
}
