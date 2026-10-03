import type { Vector3 } from 'three';
import { toRadians } from '@core/math';
import type { CameraDistance } from '@core/scene/camera';
import type { CustomView } from '@core/scene/cameraViews';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import type { CameraView, Point } from '../ids';
import {
  BACKUP_SATELLITE_OFFSET,
  BOW_CAMERA,
  DOME,
  FORMATION,
  JET,
  SATELLITE_OFFSET,
  TRANSOM_X,
  skyPoint,
} from '../model';
import type { ChaseTarget } from './assembly';
import { boatToWorld, direction, fitDistance, fitsView, nearestFit, vectorOf } from './viewFit';
import type { BoatFrame } from './viewFit';

export interface FollowTarget extends ChaseTarget {
  trim: number;
  lens: Point;
}

export type FollowSource = () => FollowTarget | null;

type OrbitView = Extract<CameraView, 'chase' | 'waterline' | 'stern'>;

interface OrbitSpec {
  bearing: number;
  elevation: number;
  width(target: FollowTarget): number;
  aim: Point;
}

const STERN_AIM_AFT = 0.15;
const STERN_WIDTH_M = 2.4;
const CHASE_WIDTH_LENGTHS = 2.2;
const WATERLINE_WIDTH_LENGTHS = 1.4;
const FIT_FILL = 0.86;
const SIDES = [-1, 1] as const;

export const ORBIT_VIEWS: Readonly<Record<OrbitView, OrbitSpec>> = {
  chase: {
    bearing: toRadians(-150),
    elevation: toRadians(18),
    width: (target) => CHASE_WIDTH_LENGTHS * target.length,
    aim: [0, 0.2, 0],
  },
  waterline: {
    bearing: toRadians(-90),
    elevation: toRadians(1.5),
    width: (target) => WATERLINE_WIDTH_LENGTHS * target.length,
    aim: [0, 0.1, 0],
  },
  stern: {
    bearing: toRadians(-145),
    elevation: toRadians(12),
    width: () => STERN_WIDTH_M,
    aim: [TRANSOM_X - STERN_AIM_AFT, JET.axisY, 0],
  },
};

export const GROUP_VIEW = {
  bearing: toRadians(165),
  elevation: toRadians(16),
  width: 60,
  aimAhead: 120,
  maxDistance: 900,
} as const;

export const SKY_VIEW = {
  bearing: toRadians(175),
  height: 4,
  back: { min: 45, max: 160 },
  fill: 0.72,
  aimAhead: 45,
} as const;

const EYE_CLEARANCE_M = 0.06;

export const EYE_VIEW = {
  forward: DOME.ringRadius + EYE_CLEARANCE_M,
  rise: DOME.top - DOME.lens + EYE_CLEARANCE_M,
  window: [BOW_CAMERA.x[1] - DOME.x, BOW_CAMERA.window.y - DOME.lens, 0] as Point,
  windowShare: 0.65,
  look: 0.1,
  lookUp: toRadians(60),
} as const;

export const VIEW_DISTANCE: Readonly<Partial<Record<CameraView, CameraDistance>>> = {
  stern: { min: 1.2, max: 30 },
  waterline: { min: 4, max: 80 },
  eye: { min: EYE_VIEW.look, max: EYE_VIEW.look },
};

export const LOOK_AROUND_POLAR: Readonly<Partial<Record<CameraView, number>>> = {
  eye: Math.PI / 2 + EYE_VIEW.lookUp,
};

function frameOf(target: FollowTarget): BoatFrame {
  return { position: target.position, heading: target.heading, trim: target.trim };
}

function level(target: FollowTarget): BoatFrame {
  return { ...frameOf(target), trim: 0 };
}

export function orbitPose(
  target: FollowTarget,
  spec: OrbitSpec,
  slopes: FramingSlopes,
): CameraPose {
  const aim = boatToWorld(frameOf(target), spec.aim, true);
  const distance = fitDistance(spec.width(target), slopes);
  const offset = direction(target.heading + spec.bearing, spec.elevation).multiplyScalar(distance);
  return { position: aim.clone().add(offset), target: aim };
}

function formationPoints(target: FollowTarget): Vector3[] {
  const frame = level(target);
  const slots = SIDES.map((side) =>
    boatToWorld(frame, [-FORMATION.back, 0, side * FORMATION.side], false),
  );
  return [vectorOf(target.position), ...slots];
}

export function groupPose(target: FollowTarget, slopes: FramingSlopes): CameraPose {
  const boat = vectorOf(target.position);
  const aim = boatToWorld(level(target), [GROUP_VIEW.aimAhead, 0, 0], false);
  const away = direction(target.heading + GROUP_VIEW.bearing, GROUP_VIEW.elevation);
  const points = formationPoints(target);
  return nearestFit(
    (distance) => ({ position: boat.clone().addScaledVector(away, distance), target: aim.clone() }),
    (pose) => fitsView(pose, points, slopes, FIT_FILL),
    { min: fitDistance(GROUP_VIEW.width, slopes), max: GROUP_VIEW.maxDistance },
  );
}

function skyPoints(target: FollowTarget): Vector3[] {
  return [
    vectorOf(target.position),
    vectorOf(skyPoint(target.position, SATELLITE_OFFSET)),
    vectorOf(skyPoint(target.position, BACKUP_SATELLITE_OFFSET)),
  ];
}

function elevationFrom(from: Vector3, point: Vector3): number {
  const rise = point.y - from.y;
  return Math.atan2(rise, Math.hypot(point.x - from.x, point.z - from.z));
}

export function skyPitch(elevations: readonly number[], slopes: FramingSlopes): number {
  const low = Math.min(...elevations);
  const high = Math.max(...elevations);
  const reach = Math.atan(slopes.vertical * SKY_VIEW.fill);
  return Math.min((low + high) / 2, low + reach);
}

function skyPoseAt(
  target: FollowTarget,
  back: number,
  points: readonly Vector3[],
  slopes: FramingSlopes,
): CameraPose {
  const behind = direction(target.heading + SKY_VIEW.bearing, 0).multiplyScalar(back);
  const position = vectorOf(target.position).add(behind).setY(SKY_VIEW.height);
  const ahead = boatToWorld(level(target), [SKY_VIEW.aimAhead, 0, 0], false);
  const azimuth = Math.atan2(ahead.z - position.z, ahead.x - position.x);
  const pitch = skyPitch(
    points.map((point) => elevationFrom(position, point)),
    slopes,
  );
  const reach = back + SKY_VIEW.aimAhead;
  return { position, target: position.clone().addScaledVector(direction(azimuth, pitch), reach) };
}

export function skyPose(target: FollowTarget, slopes: FramingSlopes): CameraPose {
  const points = skyPoints(target);
  return nearestFit(
    (back) => skyPoseAt(target, back, points, slopes),
    (pose) => fitsView(pose, points, slopes, SKY_VIEW.fill),
    SKY_VIEW.back,
  );
}

export function eyePitch(slopes: FramingSlopes): number {
  const [windowX, windowY] = EYE_VIEW.window;
  const down = Math.atan2(windowY - EYE_VIEW.rise, windowX - EYE_VIEW.forward);
  return down + Math.atan(slopes.vertical * EYE_VIEW.windowShare);
}

export function eyePose(target: FollowTarget, slopes: FramingSlopes): CameraPose {
  const frame = { ...frameOf(target), position: target.lens };
  const { forward, rise, look } = EYE_VIEW;
  const pitch = eyePitch(slopes);
  const ahead: Point = [forward + look * Math.cos(pitch), rise + look * Math.sin(pitch), 0];
  return {
    position: boatToWorld(frame, [forward, rise, 0], true),
    target: boatToWorld(frame, ahead, true),
  };
}

function followView(
  source: FollowSource,
  pose: (target: FollowTarget, slopes: FramingSlopes) => CameraPose,
  distance?: CameraDistance,
): CustomView {
  return {
    pose: (slopes) => {
      const target = source();
      return target ? pose(target, slopes) : null;
    },
    follow: 'position',
    distance,
  };
}

function orbitView(source: FollowSource, view: OrbitView): CustomView {
  return followView(
    source,
    (target, slopes) => orbitPose(target, ORBIT_VIEWS[view], slopes),
    VIEW_DISTANCE[view],
  );
}

export function cameraViews(source: FollowSource): Record<CameraView, CustomView> {
  return {
    chase: orbitView(source, 'chase'),
    waterline: orbitView(source, 'waterline'),
    stern: orbitView(source, 'stern'),
    sky: followView(source, skyPose, VIEW_DISTANCE.sky),
    eye: followView(source, eyePose, VIEW_DISTANCE.eye),
    group: followView(source, groupPose, VIEW_DISTANCE.group),
  };
}
