import type { FramedView } from '@core/scene/cameraViews';
import type { RegionSpec } from '@core/scene/regions';
import type { CameraView, RegionId } from '../ids';

export const VIEW_FRAMES: Readonly<Record<CameraView, RegionSpec>> = {
  whole: { x: [-1.75, 0.85], y: [-0.55, 0.35], z: [-0.4, 0.4] },
  catch: { x: [-0.08, 0.72], y: [-0.6, -0.05], z: [0.1, 0.35] },
  pull: { x: [-0.85, 0.7], y: [-0.68, 0], z: [0.1, 0.4] },
  roll: { x: [-0.3, 0.45], y: [-0.4, 0.35], z: [-0.35, 0.35] },
  kick: { x: [-1.8, -0.45], y: [-0.45, 0.05], z: [-0.2, 0.2] },
  drag: { x: [-1.2, 0.5], y: [-0.3, 0.15], z: [-0.25, 0.25] },
};

export const CAMERA_VIEWS: Readonly<Record<CameraView, FramedView<CameraView>>> = {
  whole: { region: 'whole', direction: [-1, 0.8, 0.45], margin: 0.7 },
  catch: { region: 'catch', direction: [-0.35, -0.85, 0.42], margin: 0.8 },
  pull: { region: 'pull', direction: [-0.45, 0.85, 0.22], margin: 0.85 },
  roll: { region: 'roll', direction: [1, 0.15, 0.12], margin: 1.15 },
  kick: { region: 'kick', direction: [-1, 0.03, 0.35], margin: 1.05 },
  drag: { region: 'drag', direction: [1, 0.06, 0.3], margin: 1.1 },
};

export const BOUNDS_REGIONS: readonly RegionId[] = ['body', 'rightArm', 'forebody'];
