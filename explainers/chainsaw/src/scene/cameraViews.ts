import type { Direction, FramedView } from '@core/scene/cameraViews';
import { CAMERA_VIEW_IDS } from '../ids';
import type { CameraView, RegionId } from '../ids';

export const STAGE_VARIANTS = ['phone', 'desktop'] as const;

export type StageVariant = (typeof STAGE_VARIANTS)[number];

type PerVariant<T> = Readonly<Record<StageVariant, T>>;

export interface StageView {
  region: RegionId;
  direction: PerVariant<Direction>;
  margin: PerVariant<number>;
}

const PHONE_STAGE_WIDTH_PX = 600;

export function stageVariant(width: number): StageVariant {
  return width < PHONE_STAGE_WIDTH_PX ? 'phone' : 'desktop';
}

function both(margin: number): PerVariant<number> {
  return { phone: margin, desktop: margin };
}

export const CAMERA_VIEWS: Readonly<Record<CameraView, StageView>> = {
  sawSide: {
    region: 'saw',
    direction: { phone: [0.1, 0.4, 1], desktop: [0.15, 0.35, 1] },
    margin: { phone: 0.8, desktop: 1.1 },
  },
  cylinderCut: {
    region: 'cylinder',
    direction: { phone: [0.05, 0.1, 1], desktop: [0.08, 0.12, 1] },
    margin: { phone: 1.15, desktop: 1.3 },
  },
  carburettor: {
    region: 'carb',
    direction: { phone: [-0.35, 0.3, 1], desktop: [-0.3, 0.25, 1] },
    margin: both(1.15),
  },
  clutchSprocket: {
    region: 'clutch',
    direction: { phone: [0.3, 0.25, 1], desktop: [0.35, 0.3, 1] },
    margin: both(1.2),
  },
  barChain: {
    region: 'bar',
    direction: { phone: [0.05, 1.5, 1], desktop: [0.1, 1.2, 1] },
    margin: both(1.05),
  },
  kickbackWide: {
    region: 'kickback',
    direction: { phone: [0, 0.15, 1], desktop: [0.05, 0.2, 1] },
    margin: both(1.1),
  },
};

export function framedViews(variant: StageVariant): Record<CameraView, FramedView<RegionId>> {
  return Object.fromEntries(
    CAMERA_VIEW_IDS.map((id) => {
      const { region, direction, margin } = CAMERA_VIEWS[id];
      return [id, { region, direction: direction[variant], margin: margin[variant] }];
    }),
  ) as Record<CameraView, FramedView<RegionId>>;
}
