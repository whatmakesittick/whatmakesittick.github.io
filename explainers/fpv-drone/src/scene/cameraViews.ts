import { Euler, Vector3 } from 'three';
import { toRadians } from '@core/math';
import type { CustomView, FramedView, ViewSpec } from '@core/scene/cameraViews';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import type { CameraView, Point, RegionId } from '../ids';
import { DRONE, DRONE_LAYOUT, droneUnits } from '../model';
import type { ChaseTarget } from './assembly';

export type ChaseSource = () => ChaseTarget | null;

type FollowView = Extract<CameraView, 'chase' | 'top' | 'close' | 'side'>;
type FixedView = Extract<CameraView, 'pilot'>;

export interface FollowSpec {
  bearing: number;
  elevation: number;
  spans: number;
  aimAhead: number;
  aimUp: number;
}

const DRONE_ROTATION_ORDER = 'YZX';
const FPV_LOOK_AHEAD_M = 60;
const PILOT_MARGIN = 1.05;

export const FOLLOW_VIEWS: Readonly<Record<FollowView, FollowSpec>> = {
  chase: { bearing: toRadians(-150), elevation: toRadians(18), spans: 2.4, aimAhead: 0, aimUp: 0 },
  top: { bearing: toRadians(180), elevation: toRadians(80), spans: 2, aimAhead: 0, aimUp: 0 },
  close: { bearing: toRadians(-60), elevation: toRadians(20), spans: 1.9, aimAhead: 0, aimUp: 0 },
  side: { bearing: toRadians(90), elevation: toRadians(5), spans: 2, aimAhead: 0, aimUp: 0 },
};

export const FIXED_VIEWS: Readonly<Record<FixedView, FramedView<RegionId>>> = {
  pilot: { region: 'route', direction: [-1, 0.42, 0.12], margin: PILOT_MARGIN },
};

export const CAMERA_OFFSET: Point = [
  droneUnits(DRONE_LAYOUT.camera[0]),
  droneUnits(DRONE_LAYOUT.camera[1]),
  droneUnits(DRONE_LAYOUT.camera[2]),
];

function vectorOf(point: Point): Vector3 {
  return new Vector3(point[0], point[1], point[2]);
}

function direction(azimuth: number, elevation: number): Vector3 {
  const level = Math.cos(elevation);
  return new Vector3(level * Math.cos(azimuth), Math.sin(elevation), level * Math.sin(azimuth));
}

function fitDistance(size: number, slopes: FramingSlopes): number {
  return size / (2 * Math.min(slopes.horizontal, slopes.vertical));
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

export function droneEuler(chase: Pick<ChaseTarget, 'heading' | 'pitch' | 'roll'>): Euler {
  return new Euler(chase.roll, -chase.heading, -chase.pitch, DRONE_ROTATION_ORDER);
}

export function fpvPose(chase: ChaseTarget): CameraPose {
  const offset = vectorOf(CAMERA_OFFSET).applyEuler(droneEuler(chase));
  const position = vectorOf(chase.position).add(offset);
  const look = direction(chase.heading, DRONE.cameraTilt - chase.pitch);
  return { position, target: position.clone().addScaledVector(look, FPV_LOOK_AHEAD_M) };
}

function followView(source: ChaseSource, spec: FollowSpec): CustomView {
  return {
    pose: (slopes) => {
      const chase = source();
      return chase ? followPose(chase, spec, slopes) : null;
    },
    follow: 'heading',
  };
}

function fpvView(source: ChaseSource): CustomView {
  return {
    pose: () => {
      const chase = source();
      return chase ? fpvPose(chase) : null;
    },
    follow: 'attitude',
  };
}

export function cameraViews(source: ChaseSource): Record<CameraView, ViewSpec<RegionId>> {
  return {
    chase: followView(source, FOLLOW_VIEWS.chase),
    top: followView(source, FOLLOW_VIEWS.top),
    close: followView(source, FOLLOW_VIEWS.close),
    side: followView(source, FOLLOW_VIEWS.side),
    fpv: fpvView(source),
    ...FIXED_VIEWS,
  };
}
