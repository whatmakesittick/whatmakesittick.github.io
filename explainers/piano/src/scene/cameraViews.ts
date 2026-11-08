import type { FramedView } from '@core/scene/cameraViews';
import type { CameraView, RegionId } from '../ids';

export const CAMERA_VIEWS: Readonly<Record<CameraView, FramedView<RegionId>>> = {
  grand: { region: 'grand', direction: [-0.8, 0.5, 0.75], margin: 1.04 },
  action: { region: 'action', direction: [-1, -0.08, 0.5], margin: 1.01 },
  escapement: { region: 'escapement', direction: [-1, -0.12, 0.3], margin: 1.04 },
  dampers: { region: 'dampers', direction: [-0.7, 0.75, 0.45], margin: 1.06 },
  soundboard: { region: 'string', direction: [-0.24, 0.375, 0.896], margin: 1.02 },
  lineUp: { region: 'lineUp', direction: [-1, -0.04, 0], margin: 1.02 },
};
