import type { FramedView } from '@core/scene/cameraViews';
import { VIEW_IN_SCALE } from '../ids';
import type { CameraView, RegionId, ScaleId } from '../ids';

export const CAMERA_VIEWS: Readonly<Record<CameraView, FramedView<RegionId>>> = {
  profile: { region: 'head', direction: [0.15, 0.1, 1], margin: 1.05 },
  nose: { region: 'nose', direction: [0.2, 0.1, 1], margin: 1.05 },
  tongue: { region: 'tonguePatch', direction: [0, 0.8, 0.6], margin: 1.05 },
  scoop: { region: 'scoop', direction: [0.3, 0.35, 1], margin: 1.1 },
  receptors: { region: 'receptorGrid', direction: [0, 0.7, 0.8], margin: 1.05 },
  molecules: { region: 'lineup', direction: [0, 0.15, 1], margin: 1.05 },
};

export function cameraFor(view: CameraView, scale: ScaleId): CameraView {
  return VIEW_IN_SCALE[view][scale];
}

export const BOUNDS_REGIONS: Readonly<Record<ScaleId, readonly RegionId[]>> = {
  head: ['head'],
  tongue: ['tonguePatch', 'scoop'],
  molecules: ['receptorGrid', 'lineup'],
};
