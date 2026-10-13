import { Vector3 } from 'three';
import type { Box3 } from 'three';
import type { CustomView, Direction, FramedView } from '@core/scene/cameraViews';
import { frameBox } from '@core/scene/frameBox';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
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

const GAUGE_ROOM: PerVariant<Partial<Record<RegionId, number>>> = {
  phone: {},
  desktop: { starter: 0.1 },
};

export function framedRegion(box: Box3 | null, id: RegionId, variant: StageVariant): Box3 | null {
  const room = GAUGE_ROOM[variant][id];
  if (!box || room === undefined) return box;
  const framed = box.clone();
  framed.min.y -= room;
  return framed;
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
  starterSide: {
    region: 'starter',
    direction: { phone: [-0.25, 0.45, -1], desktop: [-0.3, 0.35, -1] },
    margin: { phone: 0.9, desktop: 0.56 },
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
    margin: { phone: 1, desktop: 1.1 },
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

export const FRAME_LIFT: PerVariant<number> = { phone: 0.1, desktop: 0.2 };

const WORLD_UP = new Vector3(0, 1, 0);

export function liftedPose(pose: CameraPose, slopes: FramingSlopes, lift: number): CameraPose {
  const forward = pose.target.clone().sub(pose.position);
  const right = new Vector3().crossVectors(forward, WORLD_UP).normalize();
  const up = new Vector3().crossVectors(right, forward).normalize();
  const shift = up.multiplyScalar(-lift * forward.length() * slopes.vertical);
  return { position: pose.position.clone().add(shift), target: pose.target.clone().add(shift) };
}

export function liftedViews(
  variant: StageVariant,
  region: (id: RegionId) => Box3 | null,
): Record<CameraView, CustomView> {
  return Object.fromEntries(
    CAMERA_VIEW_IDS.map((id) => {
      const spec = CAMERA_VIEWS[id];
      const toward = new Vector3(...spec.direction[variant]).normalize();
      const margin = spec.margin[variant];
      const pose = (slopes: FramingSlopes): CameraPose | null => {
        const box = region(spec.region);
        if (!box) return null;
        return liftedPose(frameBox(box, toward, slopes, margin), slopes, FRAME_LIFT[variant]);
      };
      return [id, { pose }];
    }),
  ) as Record<CameraView, CustomView>;
}
