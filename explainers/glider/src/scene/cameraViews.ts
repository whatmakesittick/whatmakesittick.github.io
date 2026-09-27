import { Vector3 } from 'three';
import { toRadians } from '@core/math';
import { frameBox } from '@core/scene/frameBox';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import type { CameraView } from '../state';
import { regionBox } from './regions';
import type { RegionId } from './regions';

type FixedView = Exclude<CameraView, 'chase'>;

interface ViewSpec {
  region: RegionId;
  direction: readonly [number, number, number];
  margin: number;
}

export interface ChaseTarget {
  position: Vector3;
  heading: number;
  span: number;
  reachBelow: number;
}

const VIEWS: Record<FixedView, ViewSpec> = {
  overview: { region: 'overview', direction: [-0.35, 0.32, 1], margin: 1.02 },
  thermal: { region: 'thermal', direction: [-0.35, 0.45, 1], margin: 1.05 },
  cloud: { region: 'cloud', direction: [0.15, -0.2, 1], margin: 1.02 },
  ridge: { region: 'ridge', direction: [0, 0.7, 1], margin: 1.02 },
  wave: { region: 'wave', direction: [-0.9, 0.28, 0.6], margin: 1.02 },
};

const CHASE = {
  offTail: toRadians(45),
  elevation: toRadians(13),
  lookDown: toRadians(11),
  spanShare: 0.75,
  frameFill: 0.82,
} as const;

function chaseDistance(span: number, reachBelow: number, slopes: FramingSlopes): number {
  const roomBelow =
    Math.atan(slopes.vertical) * CHASE.frameFill - (CHASE.elevation - CHASE.lookDown);
  return Math.max(
    span / (2 * slopes.horizontal * CHASE.spanShare),
    reachBelow / Math.tan(roomBelow),
  );
}

function chasePose(target: ChaseTarget, slopes: FramingSlopes): CameraPose {
  const { position, heading, span, reachBelow } = target;
  const distance = chaseDistance(span, reachBelow, slopes);
  const bearing = heading + Math.PI - CHASE.offTail;
  const level = distance * Math.cos(CHASE.elevation);
  const height = distance * Math.sin(CHASE.elevation);
  const offset = new Vector3(level * Math.cos(bearing), height, level * Math.sin(bearing));
  const aimAbove = height - level * Math.tan(CHASE.lookDown);
  return {
    position: position.clone().add(offset),
    target: position.clone().setY(position.y + aimAbove),
  };
}

export function poseForView(
  view: CameraView,
  chase: ChaseTarget,
  slopes: FramingSlopes,
): CameraPose {
  if (view === 'chase') return chasePose(chase, slopes);
  const spec = VIEWS[view];
  const direction = new Vector3(...spec.direction).normalize();
  return frameBox(regionBox(spec.region), direction, slopes, spec.margin);
}
