import { Vector3 } from 'three';
import { toRadians } from '@core/math';
import type { FollowMode } from '@core/scene/camera';
import type { CustomView, Direction, FramedView, ViewSpec } from '@core/scene/cameraViews';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import type { CameraView, ChaseTarget } from '../ids';
import type { FramedRegionId } from './regions';

export type ChaseSource = () => ChaseTarget | null;

export type FollowView = Extract<CameraView, 'chase'>;
export type FixedView = Exclude<CameraView, FollowView>;

export interface CompassView {
  region: FramedRegionId;
  bearing: number;
  elevation: number;
  margin: number;
}

export interface FollowSpec {
  bearing: number;
  elevation: number;
  spans: number;
}

export const FOLLOW_MODE: FollowMode = 'position';
export const CHASE_VIEW: FollowView = 'chase';

const BEHIND = Math.PI;

export const CHASE: FollowSpec = { bearing: toRadians(45), elevation: toRadians(28), spans: 0.8 };

export const COMPASS_VIEWS: Readonly<Record<FixedView, CompassView>> = {
  campus: { region: 'campusAndLine', bearing: 232, elevation: 40, margin: 1 },
  powerYard: { region: 'yardAndRoom', bearing: 215, elevation: 33, margin: 1 },
  rackSide: { region: 'rack', bearing: 240, elevation: -2, margin: 1.03 },
  networkRow: { region: 'networkRow', bearing: 80, elevation: 42, margin: 1 },
  coolingPlant: { region: 'coolingLoop', bearing: 157, elevation: 34, margin: 1 },
  lineUp: { region: 'lineUp', bearing: 250, elevation: 4, margin: 1 },
};

export function compass(bearing: number, elevation: number): Direction {
  const turn = toRadians(bearing);
  const rise = toRadians(elevation);
  const level = Math.cos(rise);
  return [level * Math.sin(turn), Math.sin(rise), -level * Math.cos(turn)];
}

function framed({ region, bearing, elevation, margin }: CompassView): FramedView<FramedRegionId> {
  return { region, direction: compass(bearing, elevation), margin };
}

export const FIXED_VIEWS = Object.fromEntries(
  Object.entries(COMPASS_VIEWS).map(([id, view]) => [id, framed(view)]),
) as Readonly<Record<FixedView, FramedView<FramedRegionId>>>;

function along(heading: number, elevation: number): Vector3 {
  const level = Math.cos(elevation);
  return new Vector3(level * Math.cos(heading), Math.sin(elevation), -level * Math.sin(heading));
}

function fitDistance(size: number, slopes: FramingSlopes): number {
  return size / (2 * Math.min(slopes.horizontal, slopes.vertical));
}

export function chasePose(chase: ChaseTarget, spec: FollowSpec, slopes: FramingSlopes): CameraPose {
  const target = new Vector3(...chase.position);
  const distance = fitDistance(spec.spans * chase.span, slopes);
  const away = along(chase.heading + BEHIND + spec.bearing, spec.elevation);
  return { position: target.clone().addScaledVector(away, distance), target };
}

function followView(source: ChaseSource, spec: FollowSpec): CustomView {
  return {
    pose: (slopes) => {
      const chase = source();
      return chase ? chasePose(chase, spec, slopes) : null;
    },
    follow: FOLLOW_MODE,
  };
}

export function cameraViews(source: ChaseSource): Record<CameraView, ViewSpec<FramedRegionId>> {
  return { ...FIXED_VIEWS, chase: followView(source, CHASE) };
}
