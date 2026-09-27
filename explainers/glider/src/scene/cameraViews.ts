import { Box3, Vector3 } from 'three';
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
}

const VIEWS: Record<FixedView, ViewSpec> = {
  overview: { region: 'overview', direction: [-0.7, 0.3, 0.75], margin: 1.02 },
  thermal: { region: 'thermal', direction: [-0.35, 0.2, 1], margin: 1.05 },
  cloud: { region: 'cloud', direction: [-0.3, -0.12, 1], margin: 1.02 },
  ridge: { region: 'ridge', direction: [-0.45, 0.28, 1], margin: 1.02 },
  wave: { region: 'wave', direction: [-0.55, 0.14, 1], margin: 1.02 },
};

const CHASE = { halfSize: 5.4, behind: 0.8, above: 0.24, aside: 1, margin: 1.05 } as const;

function chasePose(target: ChaseTarget, slopes: FramingSlopes): CameraPose {
  const { position, heading } = target;
  const half = new Vector3().setScalar(CHASE.halfSize);
  const box = new Box3(position.clone().sub(half), position.clone().add(half));
  const direction = new Vector3(
    -CHASE.behind * Math.cos(heading) - CHASE.aside * Math.sin(heading),
    CHASE.above,
    -CHASE.behind * Math.sin(heading) + CHASE.aside * Math.cos(heading),
  ).normalize();
  return frameBox(box, direction, slopes, CHASE.margin);
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
