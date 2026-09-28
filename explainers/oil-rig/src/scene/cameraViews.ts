import { Vector3 } from 'three';
import type { Object3D } from 'three';
import { toRadians } from '@core/math';
import type { CustomView, FramedView, ViewSpec } from '@core/scene/cameraViews';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import type { RegionId } from '../ids';
import type { CameraView } from '../state';

type FramedViewId = Exclude<CameraView, 'bit'>;

const FRAMED_VIEWS: Record<FramedViewId, FramedView<RegionId>> = {
  overview: {
    region: 'scene',
    direction: [0.55, 0.24, 1],
    margin: 1.02,
    distance: { min: 120, max: 3000 },
  },
  waterline: {
    region: 'waterline',
    direction: [0.8, 0.08, 1],
    margin: 1.06,
    distance: { min: 25, max: 1200 },
  },
  drillFloor: {
    region: 'drillFloor',
    direction: [0.8, 0.3, 1],
    margin: 1.08,
    distance: { min: 12, max: 800 },
  },
  seabed: {
    region: 'seabed',
    direction: [0.65, 0.2, 1],
    margin: 1.1,
    distance: { min: 8, max: 800 },
  },
  trap: {
    region: 'trap',
    direction: [0.2, 0.1, 1],
    margin: 1.04,
    distance: { min: 30, max: 2000 },
  },
  completion: {
    region: 'completion',
    direction: [0.4, 0.08, 1],
    margin: 1.04,
    distance: { min: 30, max: 3000 },
  },
  well: {
    region: 'well',
    direction: [0.3, 0.06, 1],
    margin: 1.04,
    distance: { min: 30, max: 3000 },
  },
};

const BIT_VIEW = {
  azimuth: toRadians(30),
  elevation: toRadians(12),
  span: 30,
  liftShare: 0.15,
  distance: { min: 4, max: 500 },
} as const;

function bitPose(anchor: Object3D, slopes: FramingSlopes): CameraPose {
  const target = anchor.getWorldPosition(new Vector3());
  target.y += BIT_VIEW.span * BIT_VIEW.liftShare;
  const distance = BIT_VIEW.span / 2 / slopes.vertical;
  const level = distance * Math.cos(BIT_VIEW.elevation);
  const offset = new Vector3(
    level * Math.sin(BIT_VIEW.azimuth),
    distance * Math.sin(BIT_VIEW.elevation),
    level * Math.cos(BIT_VIEW.azimuth),
  );
  return { position: target.clone().add(offset), target };
}

export function cameraViews(
  bitAnchor: () => Object3D | null,
): Record<CameraView, ViewSpec<RegionId>> {
  const bit: CustomView = {
    pose: (slopes) => {
      const anchor = bitAnchor();
      return anchor ? bitPose(anchor, slopes) : null;
    },
    follow: true,
    distance: BIT_VIEW.distance,
  };
  return { ...FRAMED_VIEWS, bit };
}
