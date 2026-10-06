import type { Direction, FramedView } from '@core/scene/cameraViews';
import type { CameraView, RegionId } from '../ids';

export const STAGE_VARIANTS = ['phone', 'desktop'] as const;

export type StageVariant = (typeof STAGE_VARIANTS)[number];

export interface StageView extends FramedView<RegionId> {
  direction: Readonly<Record<StageVariant, Direction>>;
}

const PHONE_STAGE_WIDTH_PX = 600;

export function stageVariant(width: number): StageVariant {
  return width < PHONE_STAGE_WIDTH_PX ? 'phone' : 'desktop';
}

export const CAMERA_VIEWS: Readonly<Record<CameraView, StageView>> = {
  room: {
    region: 'room',
    direction: { phone: [-0.25, 0.3, 1], desktop: [-0.45, 0.25, 1] },
    margin: 0.95,
  },
  cryostat: {
    region: 'layers',
    direction: { phone: [0.5, 0.5, 1], desktop: [0.55, 0.45, 1] },
    margin: 1.55,
  },
  voxel: {
    region: 'voxel',
    direction: { phone: [1, 0.6, 0.35], desktop: [1, 0.6, 0.35] },
    margin: 1.35,
  },
  coil: {
    region: 'bore',
    direction: { phone: [0.25, 0.7, 1], desktop: [0.25, 0.7, 1] },
    margin: 1.7,
  },
  gradient: {
    region: 'bore',
    direction: { phone: [1, 0.6, 0.25], desktop: [1, 0.6, 0.25] },
    margin: 2.2,
  },
  console: {
    region: 'console',
    direction: { phone: [-0.8, 0.45, 0.9], desktop: [-1, 0.3, 0.45] },
    margin: 1.5,
  },
};
