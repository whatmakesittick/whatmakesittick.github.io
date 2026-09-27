import type { FramedView } from '@core/scene/cameraViews';
import type { CameraView } from '../state';
import { CAMERA } from './constants';
import type { RegionId } from './regions';

export const VIEWS: Record<CameraView, FramedView<RegionId>> = {
  overview: { region: 'instrument', direction: [1, 0.3, 0.42], margin: 1.04 },
  condenser: { region: 'illumination', direction: [0.85, 0.2, 0.75], margin: 1.06 },
  objective: { region: 'objective', direction: [1, 0.6, 0.35], margin: 1.06 },
  eyepiece: { region: 'eyepiece', direction: [1, 0.42, 0.3], margin: 1.06 },
  aperture: {
    region: 'aperture',
    direction: [1, 0.14, 0.22],
    margin: 1.08,
    distance: { min: CAMERA.apertureMinDistance },
  },
  stage: { region: 'stage', direction: [1, 0.36, 0.62], margin: 1.06 },
};
