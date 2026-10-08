import type { Direction, FramedView } from '@core/scene/cameraViews';
import type { AnchorId, CameraView, RegionId } from '../ids';

export const STAGE_VARIANTS = ['phone', 'desktop'] as const;

export type StageVariant = (typeof STAGE_VARIANTS)[number];

export interface StageView extends FramedView<RegionId> {
  direction: Readonly<Record<StageVariant, Direction>>;
}

const PHONE_STAGE_WIDTH_PX = 600;

export const FOLLOWED_ANCHOR: AnchorId = 'yawPivot';

export function stageVariant(width: number): StageVariant {
  return width < PHONE_STAGE_WIDTH_PX ? 'phone' : 'desktop';
}

export const CAMERA_VIEWS: Readonly<Record<CameraView, StageView>> = {
  farmAerial: {
    region: 'farm',
    direction: { phone: [-0.3, 1.15, 1], desktop: [-0.6, 1.1, 1] },
    margin: 1.05,
    distance: { min: 2000, max: 20000 },
  },
  turbineTall: {
    region: 'turbine',
    direction: { phone: [-1, 0.16, 0.45], desktop: [-1, 0.16, 0.7] },
    margin: 1.1,
    distance: { min: 150, max: 2500 },
  },
  nacelleCutaway: {
    region: 'nacelle',
    direction: { phone: [0.25, 0.9, 1], desktop: [0.1, 0.75, 1] },
    margin: 1.2,
    follow: 'heading',
    distance: { min: 8, max: 150 },
  },
  rotorQuarter: {
    region: 'rotor',
    direction: { phone: [-1, 0.16, 0.75], desktop: [-0.8, 0.16, 1] },
    margin: 1.1,
    follow: 'heading',
    distance: { min: 80, max: 1200 },
  },
  wakeStreaks: {
    region: 'wakes',
    direction: { phone: [-0.35, 0.55, 1], desktop: [-0.2, 0.47, 1] },
    margin: 1.05,
    distance: { min: 1500, max: 18000 },
  },
  gridSubstation: {
    region: 'grid',
    direction: { phone: [0.6, 1.75, 1], desktop: [0.75, 1.65, 1] },
    margin: 1.05,
    distance: { min: 600, max: 15000 },
  },
};
