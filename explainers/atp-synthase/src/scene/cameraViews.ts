import type { FramedView } from '@core/scene/cameraViews';
import type { RegionId } from '../ids';
import type { CameraView } from '../state';

export const WIDE_DISTANCE = { min: 60, max: 3200 } as const;
export const CLOSE_DISTANCE = { min: 30, max: 1600 } as const;

export const CAMERA_VIEWS: Readonly<Record<CameraView, FramedView<RegionId>>> = {
  motor: { region: 'motor', direction: [0.85, 0.3, 0.6], margin: 1.12, distance: WIDE_DISTANCE },
  pumps: { region: 'pumps', direction: [-0.8, 0.3, 1], margin: 1.02, distance: CLOSE_DISTANCE },
  ring: { region: 'rotor', direction: [0.75, 0.3, 0.8], margin: 1.05, distance: CLOSE_DISTANCE },
  head: { region: 'head', direction: [0.4, -0.18, 1], margin: 1.12, distance: CLOSE_DISTANCE },
  row: { region: 'row', direction: [0.7, 0.45, 1], margin: 1.05, distance: WIDE_DISTANCE },
};
