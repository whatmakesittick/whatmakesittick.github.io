import type { FramedView } from '@core/scene/cameraViews';
import type { CameraView } from '../state';
import type { RegionId } from './regions';

export const VIEWS: Record<CameraView, FramedView<RegionId>> = {
  overview: { region: 'all', direction: [0.42, 0.45, 1], margin: 1.04 },
  needle: { region: 'needle', direction: [-1, 0.4, -0.3], margin: 1.05 },
  bobbin: { region: 'bobbin', direction: [0.25, 1.2, 0.9], margin: 1.1 },
  thread: { region: 'thread', direction: [1, 0.35, 0.25], margin: 1.08 },
  feed: { region: 'feed', direction: [-1, 0.75, 0.4], margin: 1.08 },
};
