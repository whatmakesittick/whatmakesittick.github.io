import { Vector3 } from 'three';
import type { Object3D } from 'three';
import type { CustomView, Direction, FramedView, ViewSpec } from '@core/scene/cameraViews';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import type { RegionId } from '../ids';
import { mm } from '../model';
import type { CameraView } from '../state';

type FramedViewId = Exclude<CameraView, 'valve'>;

export interface AnchorFraming {
  readonly direction: Direction;
  readonly spanMm: number;
}

export const FRONT_DISTANCE = { min: 60, max: 900 } as const;
export const VALVE_DISTANCE = { min: 25, max: 400 } as const;

export const VALVE_FRAMING: AnchorFraming = { direction: [0.35, 0.12, 1], spanMm: 70 };

const FRAMED_VIEWS: Record<FramedViewId, FramedView<RegionId>> = {
  front: { region: 'scene', direction: [0.35, 0.25, 1], margin: 1.02, distance: FRONT_DISTANCE },
  section: { region: 'chambers', direction: [0.05, 0.12, 1], margin: 1.05 },
  left: { region: 'leftHeart', direction: [0.4, 0.15, 1], margin: 1.08 },
  septum: { region: 'conduction', direction: [-0.15, 0.1, 1], margin: 1.1 },
  whole: { region: 'scene', direction: [-0.3, 0.2, 1], margin: 1.05 },
};

function anchorPose(anchor: Object3D, framing: AnchorFraming, slopes: FramingSlopes): CameraPose {
  const target = anchor.getWorldPosition(new Vector3());
  const slope = Math.min(slopes.vertical, slopes.horizontal);
  const distance = mm(framing.spanMm) / 2 / slope;
  const offset = new Vector3(...framing.direction).normalize().multiplyScalar(distance);
  return { position: target.clone().add(offset), target };
}

function valveView(anchor: () => Object3D | null): CustomView {
  return {
    pose: (slopes) => {
      const object = anchor();
      return object ? anchorPose(object, VALVE_FRAMING, slopes) : null;
    },
    follow: true,
    distance: VALVE_DISTANCE,
  };
}

export function cameraViews(
  valveAnchor: () => Object3D | null,
): Record<CameraView, ViewSpec<RegionId>> {
  return { ...FRAMED_VIEWS, valve: valveView(valveAnchor) };
}
