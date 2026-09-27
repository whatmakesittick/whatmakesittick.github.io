import { Vector3 } from 'three';
import type { Box3 } from 'three';
import { frameBox } from '@core/scene/frameBox';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import type { CameraView } from '../state';
import type { RegionId } from './regions';

interface ViewSpec {
  region: RegionId;
  direction: readonly [number, number, number];
  margin: number;
}

const VIEWS: Record<CameraView, ViewSpec> = {
  overview: { region: 'all', direction: [0.42, 0.45, 1], margin: 1.04 },
  needle: { region: 'needle', direction: [-1, 0.4, -0.3], margin: 1.05 },
  bobbin: { region: 'bobbin', direction: [0.25, 1.2, 0.9], margin: 1.1 },
  thread: { region: 'thread', direction: [1, 0.35, 0.25], margin: 1.08 },
  feed: { region: 'feed', direction: [-1, 0.75, 0.4], margin: 1.08 },
};

export function poseForView(
  view: CameraView,
  region: (id: RegionId) => Box3,
  slopes: FramingSlopes,
): CameraPose {
  const spec = VIEWS[view];
  const direction = new Vector3(...spec.direction).normalize();
  return frameBox(region(spec.region), direction, slopes, spec.margin);
}
