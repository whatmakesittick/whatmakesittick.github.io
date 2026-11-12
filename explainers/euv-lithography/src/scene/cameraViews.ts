import { Vector3 } from 'three';
import { toRadians } from '@core/math';
import type { FollowMode } from '@core/scene/camera';
import type { CustomView, Direction, FramedView, ViewSpec } from '@core/scene/cameraViews';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import type { CameraView, ChaseTarget, RegionId } from '../ids';

export type ChaseSource = () => ChaseTarget | null;

export type FollowView = Extract<CameraView, 'chase'>;
export type FixedView = Exclude<CameraView, FollowView>;

export interface CompassView {
  region: RegionId;
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

export const CHASE: FollowSpec = { bearing: 45, elevation: 28, spans: 0.8 };

export const COMPASS_VIEWS: Readonly<Record<FixedView, CompassView>> = {
  overview: { region: 'machine', bearing: 200, elevation: 22, margin: 1.05 },
  source: { region: 'source', bearing: 185, elevation: 12, margin: 1 },
  lightPath: { region: 'lightPath', bearing: 180, elevation: 8, margin: 1 },
  maskStage: { region: 'maskStage', bearing: 160, elevation: -12, margin: 1 },
  waferStage: { region: 'waferStage', bearing: 165, elevation: 20, margin: 1 },
  optics: { region: 'projection', bearing: 175, elevation: 14, margin: 1 },
};

export function compass(bearing: number, elevation: number): Direction {
  const turn = toRadians(bearing);
  const rise = toRadians(elevation);
  const level = Math.cos(rise);
  return [level * Math.sin(turn), Math.sin(rise), -level * Math.cos(turn)];
}

function framed({ region, bearing, elevation, margin }: CompassView): FramedView<RegionId> {
  return { region, direction: compass(bearing, elevation), margin };
}

export const FIXED_VIEWS = Object.fromEntries(
  Object.entries(COMPASS_VIEWS).map(([id, view]) => [id, framed(view)]),
) as Readonly<Record<FixedView, FramedView<RegionId>>>;

function fitDistance(size: number, slopes: FramingSlopes): number {
  return size / (2 * Math.min(slopes.horizontal, slopes.vertical));
}

export function chasePose(chase: ChaseTarget, spec: FollowSpec, slopes: FramingSlopes): CameraPose {
  const target = new Vector3(...chase.position);
  const distance = fitDistance(spec.spans * chase.span, slopes);
  const away = new Vector3(...compass(spec.bearing, spec.elevation));
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

export function cameraViews(source: ChaseSource): Record<CameraView, ViewSpec<RegionId>> {
  return { ...FIXED_VIEWS, chase: followView(source, CHASE) };
}
