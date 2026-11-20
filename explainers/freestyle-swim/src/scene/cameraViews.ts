import type { FramedView } from '@core/scene/cameraViews';
import type { CameraView, RegionId } from '../ids';

export const CAMERA_VIEWS: Readonly<Record<CameraView, FramedView<RegionId>>> = {
  whole: { region: 'body', direction: [-1.2, 0.8, 0.7], margin: 1.1 },
  catch: { region: 'rightArm', direction: [0.9, -0.25, 0.8], margin: 1.05 },
  pull: { region: 'rightArm', direction: [-0.3, 1, 0.5], margin: 1.05 },
  roll: { region: 'shoulders', direction: [1, 0.25, 0.05], margin: 1.1 },
  kick: { region: 'legs', direction: [-0.7, -0.1, 1], margin: 1.15 },
  drag: { region: 'forebody', direction: [0.5, 0.05, 1], margin: 1.05 },
};

export const BOUNDS_REGIONS: readonly RegionId[] = ['body', 'rightArm', 'forebody'];
