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
    direction: { phone: [0.5, 0.5, 1], desktop: [0.75, 0.45, 1] },
    margin: 0.85,
  },
  cryostat: {
    region: 'layers',
    direction: { phone: [0.3, 0.25, 1], desktop: [0.5, 0.35, 1] },
    margin: 1.5,
  },
  voxel: {
    region: 'voxel',
    direction: { phone: [0.12, 0.08, 1], desktop: [0.3, 0.15, 1] },
    margin: 1.35,
  },
  coil: {
    region: 'bore',
    direction: { phone: [0.4, 0.35, 1], desktop: [1, 0.55, 0.75] },
    margin: 1.15,
  },
  gradient: {
    region: 'bore',
    direction: { phone: [1, 0.35, 0.6], desktop: [1, 0.25, 0.2] },
    margin: 1.1,
  },
  console: {
    region: 'console',
    direction: { phone: [-1, 0.15, 0.3], desktop: [-1, 0.3, 0.45] },
    margin: 2,
  },
};
