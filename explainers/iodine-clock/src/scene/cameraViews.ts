import type { FramedView } from '@core/scene/cameraViews';
import { SCALE_PARTNER, VIEW_SCALE } from '../ids';
import type { CameraView, RegionId, ScaleId } from '../ids';

export const CAMERA_VIEWS: Readonly<Record<CameraView, FramedView<RegionId>>> = {
  bench: { region: 'bench', direction: [0.15, 0.26, 1], margin: 0.98 },
  landolt: { region: 'event', direction: [0.3, 0.25, 1], margin: 1.05 },
  iodine: { region: 'event', direction: [0.25, 0.3, 1], margin: 1.4 },
  beaker: { region: 'beaker', direction: [0.1, 0.15, 1], margin: 1.05 },
  helix: { region: 'helix', direction: [0.2, 0.1, 1], margin: 1.05 },
  tuning: { region: 'tuning', direction: [0.2, 0.45, 1], margin: 1.06 },
};

export function cameraFor(view: CameraView, scale: ScaleId): CameraView {
  return VIEW_SCALE[view] === scale ? view : SCALE_PARTNER[view];
}

export const BOUNDS_REGION: Readonly<Record<ScaleId, RegionId>> = {
  beaker: 'bench',
  molecules: 'solution',
};
