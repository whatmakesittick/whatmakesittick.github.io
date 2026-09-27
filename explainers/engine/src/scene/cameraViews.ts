import type { Direction, FramedView } from '@core/scene/cameraViews';
import type { EngineLayout } from '../model';
import type { CameraView } from '../state';
import type { RegionId } from './assemblyRegions';

interface LayoutView extends FramedView<RegionId> {
  direction: Readonly<Record<EngineLayout, Direction>>;
}

export const VIEWS: Record<CameraView, LayoutView> = {
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
