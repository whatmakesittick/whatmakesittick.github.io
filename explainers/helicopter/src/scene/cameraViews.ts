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
  overview: { region: 'airframe', direction: [0.78, 0.42, -1], margin: 1.08 },
  rotor: { region: 'plan', direction: [-0.3, 1, 0], margin: 1.08 },
  hub: { region: 'hub', direction: [0.55, 0.22, -1], margin: 1.2 },
  tail: { region: 'tail', direction: [-0.62, 0.3, -1], margin: 1.3 },
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
