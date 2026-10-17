import { Euler, Vector3 } from 'three';
import { toRadians } from '@core/math';
import type { FollowMode } from '@core/scene/camera';
import type { CustomView, FramedView, ViewSpec } from '@core/scene/cameraViews';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import type { CameraView, ChaseTarget, RegionId } from '../ids';
import { CAR, CAR_ANCHORS } from '../model';
import { CAR_EULER_ORDER } from './pose';

export type ChaseSource = () => ChaseTarget | null;

export type FollowView = Extract<
  CameraView,
  'tankClose' | 'nozzleClose' | 'boostSide' | 'flipChase'
>;
export type FixedView = Exclude<CameraView, FollowView>;

export interface FollowSpec {
  bearing: number;
  elevation: number;
  spans: number;
}

export const FOLLOW_MODE: FollowMode = 'position';

export const FOLLOW_VIEWS: Readonly<Record<FollowView, FollowSpec>> = {
  tankClose: { bearing: toRadians(40), elevation: toRadians(25), spans: 1.3 },
  nozzleClose: { bearing: toRadians(150), elevation: toRadians(10), spans: 1.2 },
  boostSide: { bearing: toRadians(90), elevation: toRadians(6), spans: 2.2 },
  flipChase: { bearing: toRadians(150), elevation: toRadians(2), spans: 2.4 },
};

export const FIXED_VIEWS: Readonly<Record<FixedView, FramedView<RegionId>>> = {
  rampWide: { region: 'ramp', direction: [-0.3, 0.22, 1], margin: 1.35 },
  jumpWide: { region: 'jump', direction: [-0.35, 0.14, 1], margin: 0.55 },
  siteWide: { region: 'site', direction: [0.9, 0.25, 0.7], margin: 0.65 },
};

const CENTRE_LIFT = CAR.rideHeight + CAR_ANCHORS.car[1];

function direction(azimuth: number, elevation: number): Vector3 {
  const level = Math.cos(elevation);
  return new Vector3(level * Math.cos(azimuth), Math.sin(elevation), level * Math.sin(azimuth));
}

function fitDistance(size: number, slopes: FramingSlopes): number {
  return size / (2 * Math.min(slopes.horizontal, slopes.vertical));
}

export function carCentre({ position, heading, pitch, roll }: ChaseTarget): Vector3 {
  const attitude = new Euler(roll, -heading, pitch, CAR_EULER_ORDER);
  return new Vector3(0, CENTRE_LIFT, 0).applyEuler(attitude).add(new Vector3(...position));
}

export function followPose(
  chase: ChaseTarget,
  spec: FollowSpec,
  slopes: FramingSlopes,
): CameraPose {
  const target = carCentre(chase);
  const distance = fitDistance(spec.spans * chase.span, slopes);
  const offset = direction(chase.heading + spec.bearing, spec.elevation).multiplyScalar(distance);
  return { position: target.clone().add(offset), target };
}

function followView(source: ChaseSource, spec: FollowSpec): CustomView {
  return {
    pose: (slopes) => {
      const chase = source();
      return chase ? followPose(chase, spec, slopes) : null;
    },
    follow: FOLLOW_MODE,
  };
}

export function cameraViews(source: ChaseSource): Record<CameraView, ViewSpec<RegionId>> {
  return {
    tankClose: followView(source, FOLLOW_VIEWS.tankClose),
    nozzleClose: followView(source, FOLLOW_VIEWS.nozzleClose),
    boostSide: followView(source, FOLLOW_VIEWS.boostSide),
    flipChase: followView(source, FOLLOW_VIEWS.flipChase),
    ...FIXED_VIEWS,
  };
}
