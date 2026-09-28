import type { FramedView } from '@core/scene/cameraViews';
import type { RegionId } from '../ids';
import type { CameraView } from '../state';

export const WIDE_DISTANCE = { min: 60, max: 3200 } as const;
export const CLOSE_DISTANCE = { min: 30, max: 1600 } as const;

export const CAMERA_VIEWS: Readonly<Record<CameraView, FramedView<RegionId>>> = {
  motor: { region: 'motor', direction: [0.55, 0.3, 1], margin: 1.12, distance: WIDE_DISTANCE },
  pumps: { region: 'pumps', direction: [0.15, 0.4, 1], margin: 1.06, distance: CLOSE_DISTANCE },
  ring: { region: 'rotor', direction: [0.9, 0.18, 0.45], margin: 1.3, distance: CLOSE_DISTANCE },
  head: { region: 'head', direction: [0.3, 1.1, 1], margin: 1.2, distance: CLOSE_DISTANCE },
  row: { region: 'row', direction: [1, 0.5, 0.45], margin: 1.05, distance: WIDE_DISTANCE },
};
