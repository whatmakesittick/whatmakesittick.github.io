import type { FramedView } from '@core/scene/cameraViews';
import type { CameraView } from '../state';
import type { RegionId } from './regions';

export const VIEWS: Record<CameraView, FramedView<RegionId>> = {
  overview: { region: 'airframe', direction: [0.78, 0.42, -1], margin: 1.08 },
  rotor: { region: 'plan', direction: [-0.3, 1, 0], margin: 1.08 },
  hub: { region: 'hub', direction: [0.55, 0.22, -1], margin: 1.2 },
  tail: { region: 'tail', direction: [-0.62, 0.3, -1], margin: 1.3 },
};
