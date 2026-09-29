import type { FramedView } from '@core/scene/cameraViews';
import type { RegionId } from '../ids';
import type { CameraView } from '../state';

export const NOZZLE_DISTANCE = { max: 6000 } as const;
export const BOOSTER_DISTANCE = { min: 200, max: 8000 } as const;

export const CAMERA_VIEWS: Readonly<Record<CameraView, FramedView<RegionId>>> = {
  hero: { region: 'hero', direction: [0.85, 0.2, 1], margin: 1.08 },
  powerhead: { region: 'powerhead', direction: [0.3, 0.3, 1], margin: 1.15 },
  turbopumps: { region: 'turbopumps', direction: [0.05, 0.18, 1], margin: 1.1 },
  chamber: { region: 'chamber', direction: [0.35, 0.08, 1], margin: 1.3 },
  nozzle: {
    region: 'nozzleAndPlume',
    direction: [1, 0.05, 0.55],
    margin: 1.04,
    distance: NOZZLE_DISTANCE,
  },
  booster: {
    region: 'booster',
    direction: [0.45, -0.55, 1],
    margin: 1.05,
    distance: BOOSTER_DISTANCE,
  },
};
