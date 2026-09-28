import { Vector3 } from 'three';
import type { Object3D } from 'three';
import { toRadians } from '@core/math';
import type { CustomView, FramedView, ViewSpec } from '@core/scene/cameraViews';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import type { RegionId } from '../ids';
import { mm } from '../model';
import type { CameraView } from '../state';

type AnchoredViewId = 'wheel' | 'escapement';
type FramedViewId = Exclude<CameraView, AnchoredViewId>;

export interface AnchorFraming {
  readonly spanMm: number;
  readonly elevationDeg: number;
  readonly azimuthDeg: number;
}

export interface ViewAnchors {
  wheel(): Object3D | null;
  fork(): Object3D | null;
}

const OVERVIEW_DISTANCE = { min: 40, max: 1200 } as const;
const CLOSE_DISTANCE = { min: 3, max: 600 } as const;

const FRAMED_VIEWS: Record<FramedViewId, FramedView<RegionId>> = {
  movement: {
    region: 'movement',
    direction: [0.35, 0.3, 1],
    margin: 1.05,
    distance: OVERVIEW_DISTANCE,
  },
  barrel: { region: 'barrel', direction: [0.2, 0.35, 1], margin: 1.1, distance: CLOSE_DISTANCE },
  balance: {
    region: 'balance',
    direction: [-0.3, 0.45, 1],
    margin: 1.08,
    distance: CLOSE_DISTANCE,
  },
  dialSide: { region: 'dial', direction: [0.2, 0.25, -1], margin: 1.05, distance: CLOSE_DISTANCE },
};

export const ANCHORED_VIEWS: Record<AnchoredViewId, AnchorFraming> = {
  wheel: { spanMm: 9, elevationDeg: 55, azimuthDeg: 20 },
  escapement: { spanMm: 7, elevationDeg: 50, azimuthDeg: -25 },
};

export function anchorPose(
  anchor: Object3D,
  framing: AnchorFraming,
  slopes: FramingSlopes,
): CameraPose {
  const target = anchor.getWorldPosition(new Vector3());
  const slope = Math.min(slopes.vertical, slopes.horizontal);
  const distance = mm(framing.spanMm) / 2 / slope;
  const elevation = toRadians(framing.elevationDeg);
  const azimuth = toRadians(framing.azimuthDeg);
  const inPlane = distance * Math.cos(elevation);
  const offset = new Vector3(
    inPlane * Math.sin(azimuth),
    inPlane * Math.cos(azimuth),
    distance * Math.sin(elevation),
  );
  return { position: target.clone().add(offset), target };
}

function anchoredView(
  anchor: () => Object3D | null,
  framing: AnchorFraming,
  follow: boolean,
): CustomView {
  return {
    pose: (slopes) => {
      const object = anchor();
      return object ? anchorPose(object, framing, slopes) : null;
    },
    follow,
    distance: CLOSE_DISTANCE,
  };
}

export function cameraViews(anchors: ViewAnchors): Record<CameraView, ViewSpec<RegionId>> {
  return {
    ...FRAMED_VIEWS,
    wheel: anchoredView(anchors.wheel, ANCHORED_VIEWS.wheel, true),
    escapement: anchoredView(anchors.fork, ANCHORED_VIEWS.escapement, false),
  };
}
