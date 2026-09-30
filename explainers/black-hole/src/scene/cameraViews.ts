import { Vector3 } from 'three';
import type { CustomView, FramedView, ViewSpec } from '@core/scene/cameraViews';
import type { CameraPose } from '@core/scene/frameBox';
import type { RegionId } from '../ids';
import type { CameraView } from '../state';

type FixedView = Exclude<CameraView, 'probe' | 'ship'>;

export interface AnchorPositions {
  probe: Vector3;
  ship: Vector3;
}

export const PROBE_DISTANCE = { min: 0.8, max: 12 } as const;
export const SHIP_DISTANCE = { min: 4, max: 30 } as const;

const PROBE_CAMERA_DISTANCE = 2.6;
const PROBE_CAMERA_OFFSET = new Vector3(0.9, 0.5, 1).normalize();

export const FRAMED_VIEWS: Readonly<Record<FixedView, FramedView<RegionId>>> = {
  hero: { region: 'system', direction: [0.12, 0.22, 1], margin: 1.06 },
  lens: { region: 'hole', direction: [0.35, 0.16, 1], margin: 1.1 },
  sheet: { region: 'sheet', direction: [0.4, 1, 0.55], margin: 1.05 },
};

export function probePose(anchors: AnchorPositions): CameraPose {
  const offset = PROBE_CAMERA_OFFSET.clone().multiplyScalar(PROBE_CAMERA_DISTANCE);
  return { position: anchors.probe.clone().add(offset), target: anchors.probe.clone() };
}

export function shipPose(anchors: AnchorPositions): CameraPose {
  return { position: anchors.ship.clone(), target: anchors.probe.clone() };
}

function customView(
  anchors: () => AnchorPositions | null,
  pose: (anchors: AnchorPositions) => CameraPose,
  behaviour: Omit<CustomView, 'pose'>,
): CustomView {
  return {
    ...behaviour,
    pose: () => {
      const current = anchors();
      return current ? pose(current) : null;
    },
  };
}

export function cameraViews(
  anchors: () => AnchorPositions | null,
): Readonly<Record<CameraView, ViewSpec<RegionId>>> {
  return {
    ...FRAMED_VIEWS,
    probe: customView(anchors, probePose, { follow: true, distance: PROBE_DISTANCE }),
    ship: customView(anchors, shipPose, { distance: SHIP_DISTANCE }),
  };
}
