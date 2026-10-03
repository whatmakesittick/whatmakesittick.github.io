import { Vector3 } from 'three';
import { toRadians } from '@core/math';
import type { CameraDistance } from '@core/scene/camera';
import type { CustomView } from '@core/scene/cameraViews';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import type { CameraView, Point } from '../ids';
import {
  BACKUP_SATELLITE_OFFSET,
  BOAT,
  BOW_CAMERA,
  DOME,
  FAIRING,
  FORMATION,
  HULL_STATIONS,
  JET,
  SATELLITE_OFFSET,
  SHIP,
  TRANSOM_X,
  VENT_BOX,
  skyPoint,
} from '../model';
import type { ChaseTarget } from './assembly';
import {
  boatToWorld,
  direction,
  fitDistance,
  fitsView,
  nearestFit,
  pivotNear,
  rightOf,
  vectorOf,
} from './viewFit';
import type { BoatFrame } from './viewFit';

export interface FollowTarget extends ChaseTarget {
  trim: number;
  lens: Point;
}

export type FollowSource = () => FollowTarget | null;
export type CompactSource = () => boolean;

type OrbitView = Extract<CameraView, 'chase' | 'waterline' | 'stern'>;

interface CompactFraming {
  lead: number;
  widen: number;
}

interface OrbitSpec {
  bearing: number;
  elevation: number;
  width(target: FollowTarget): number;
  aim: Point;
  compact?: CompactFraming;
  keep?: readonly Point[];
}

const STERN_AIM_AFT = 0.15;
const STERN_WIDTH_M = 2.4;
const CHASE_WIDTH_LENGTHS = 2.2;
const WATERLINE_WIDTH_LENGTHS = 1.4;
const KEEP_FILL = 0.92;
const BOAT_LEAD = 0.12;
const WIDE_FRAMING: CompactFraming = { lead: 0, widen: 1 };
const MAX_ZOOM_OUT = 3;
const SIDES = [-1, 1] as const;
const [TRANSOM_STATION] = HULL_STATIONS;

const STERN_AIM_Y = (JET.axisY + FAIRING.top) / 2;

const STERN_KEEP: readonly Point[] = [
  [JET.steeringNozzle.x[0], JET.axisY, 0],
  [JET.intake.x[1], JET.intake.y, 0],
  ...SIDES.flatMap((side): Point[] => [
    [VENT_BOX.x[0], VENT_BOX.top, side * VENT_BOX.halfWidth],
    [FAIRING.frontTopX, FAIRING.top, side * FAIRING.topHalfWidth],
    [TRANSOM_X, TRANSOM_STATION.deck, side * TRANSOM_STATION.sheer[0]],
  ]),
];

export const ORBIT_VIEWS: Readonly<Record<OrbitView, OrbitSpec>> = {
  chase: {
    bearing: toRadians(-150),
    elevation: toRadians(18),
    width: (target) => CHASE_WIDTH_LENGTHS * target.length,
    aim: [0, 0.2, 0],
    compact: { lead: -BOAT_LEAD, widen: 1 },
  },
  waterline: {
    bearing: toRadians(-90),
    elevation: toRadians(1.5),
    width: (target) => WATERLINE_WIDTH_LENGTHS * target.length,
    aim: [0, 0.1, 0],
    compact: { lead: BOAT_LEAD, widen: 1.2 },
  },
  stern: {
    bearing: toRadians(-145),
    elevation: toRadians(12),
    width: () => STERN_WIDTH_M,
    aim: [TRANSOM_X - STERN_AIM_AFT, STERN_AIM_Y, 0],
    keep: STERN_KEEP,
  },
};

export const GROUP_VIEW = {
  behind: { min: 10, max: 160 },
  outboard: 2,
  height: 4,
  fill: 0.86,
} as const;

const PORT = -1;

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
  compact = false,
): CameraPose {
  const frame = frameOf(target);
  const away = direction(target.heading + spec.bearing, spec.elevation);
  const { lead, widen } = (compact ? spec.compact : undefined) ?? WIDE_FRAMING;
  const width = spec.width(target) * widen;
  const aim = boatToWorld(frame, spec.aim, true).addScaledVector(rightOf(away), -lead * width);
  const keep = (spec.keep ?? []).map((point) => boatToWorld(frame, point, true));
  const nearest = fitDistance(width, slopes);
  return nearestFit(
    (distance) => ({ position: aim.clone().addScaledVector(away, distance), target: aim.clone() }),
    (pose) => fitsView(pose, keep, slopes, KEEP_FILL),
    { min: nearest, max: nearest * MAX_ZOOM_OUT },
  );
}

function groupPoints(target: FollowTarget): Vector3[] {
  const frame = level(target);
  const companion = (along: number, height: number) =>
    boatToWorld(frame, [along - FORMATION.back, height, PORT * FORMATION.side], false);
  const [shipX, , shipZ] = target.ship;
  return [
    vectorOf(target.position),
    companion(-BOAT.halfLength, 0),
    companion(BOAT.halfLength, BOAT.freeboard),
    new Vector3(shipX, SHIP.mastTop, shipZ),
  ];
}

function middle(values: readonly number[]): number {
  return (Math.min(...values) + Math.max(...values)) / 2;
}

function bearingFrom(from: Vector3, point: Vector3, heading: number): number {
  const turn = Math.atan2(point.z - from.z, point.x - from.x) - heading;
  return Math.atan2(Math.sin(turn), Math.cos(turn));
}

function groupPoseAt(target: FollowTarget, behind: number, points: readonly Vector3[]): CameraPose {
  const { height, outboard } = GROUP_VIEW;
  const slot: Point = [-(FORMATION.back + behind), height, PORT * (FORMATION.side + outboard)];
  const position = boatToWorld(level(target), slot, false);
  const turn = middle(points.map((point) => bearingFrom(position, point, target.heading)));
  const pitch = middle(points.map((point) => elevationFrom(position, point)));
  return { position, target: position.clone().add(direction(target.heading + turn, pitch)) };
}

export function groupPose(target: FollowTarget, slopes: FramingSlopes): CameraPose {
  const points = groupPoints(target);
  const pose = nearestFit(
    (behind) => groupPoseAt(target, behind, points),
    (candidate) => fitsView(candidate, points, slopes, GROUP_VIEW.fill),
    GROUP_VIEW.behind,
  );
  return pivotNear(pose, vectorOf(target.position));
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
  const pose = nearestFit(
    (back) => skyPoseAt(target, back, points, slopes),
    (candidate) => fitsView(candidate, points, slopes, SKY_VIEW.fill),
    SKY_VIEW.back,
  );
  return pivotNear(pose, vectorOf(target.position));
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

function orbitView(source: FollowSource, compact: CompactSource, view: OrbitView): CustomView {
  return followView(
    source,
    (target, slopes) => orbitPose(target, ORBIT_VIEWS[view], slopes, compact()),
    VIEW_DISTANCE[view],
  );
}

export function cameraViews(
  source: FollowSource,
  compact: CompactSource = () => false,
): Record<CameraView, CustomView> {
  return {
    chase: orbitView(source, compact, 'chase'),
    waterline: orbitView(source, compact, 'waterline'),
    stern: orbitView(source, compact, 'stern'),
    sky: followView(source, skyPose, VIEW_DISTANCE.sky),
    eye: followView(source, eyePose, VIEW_DISTANCE.eye),
    group: followView(source, groupPose, VIEW_DISTANCE.group),
  };
}
