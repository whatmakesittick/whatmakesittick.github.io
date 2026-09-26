import { Vector3 } from 'three';
import type { Box3 } from 'three';
import { frameBox } from '@core/scene/frameBox';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import type { EngineLayout } from '../model';
import type { CameraView } from '../state';
import type { RegionId } from './assemblyRegions';

type Direction = readonly [number, number, number];

interface ViewSpec {
  region: RegionId;
  direction: Record<EngineLayout, Direction>;
  margin: number;
}

const VIEWS: Record<CameraView, ViewSpec> = {
  overview: {
    region: 'all',
    direction: { single: [0.62, 0.36, 1], inline4: [1, 0.46, 0.82] },
    margin: 1.18,
  },
  side: {
    region: 'column',
    direction: { single: [0.1, 0.08, 1], inline4: [1, 0.1, 0.12] },
    margin: 1.12,
  },
  head: {
    region: 'head',
    direction: { single: [0.32, 0.3, 1], inline4: [1, 0.36, 0.42] },
    margin: 1.4,
  },
  ignition: {
    region: 'chamber',
    direction: { single: [-0.28, 0.22, 1], inline4: [1, 0.22, 0.3] },
    margin: 1.2,
  },
  crank: {
    region: 'crank',
    direction: { single: [0.78, 0.14, 1], inline4: [1, 0.12, 0.6] },
    margin: 1.45,
  },
  wide: {
    region: 'all',
    direction: { single: [0.9, 0.5, 1], inline4: [1, 0.5, 0.72] },
    margin: 1.22,
  },
};

export function poseForView(
  view: CameraView,
  layout: EngineLayout,
  region: (id: RegionId) => Box3,
  slopes: FramingSlopes,
): CameraPose {
  const spec = VIEWS[view];
  const direction = new Vector3(...spec.direction[layout]).normalize();
  return frameBox(region(spec.region), direction, slopes, spec.margin);
}
