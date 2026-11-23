import type { Box3} from 'three';
import { Vector3 } from 'three';
import type { CustomView, Direction } from '@core/scene/cameraViews';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import { regionFromSpec } from '@core/scene/regions';
import type { RegionSpec } from '@core/scene/regions';
import type { CameraView, RegionId } from '../ids';

const ZOOM_LIMITS = { min: 0.5, max: 14 } as const;
const UP = new Vector3(0, 1, 0);

export interface RunShot {
  readonly box: RegionSpec;
  readonly direction: Direction;
  readonly margin: number;
  readonly focus: readonly [x: number, y: number, z: number];
}

export const RUN_SHOTS: Readonly<Record<CameraView, RunShot>> = {
  hero: {
    box: { x: [-0.5, 0.55], y: [0, 1.82], z: [-0.25, 0.3] },
    direction: [0.78, 0.085, 1.0],
    margin: 1.04,
    focus: [0.03, -0.25, 0],
  },
  foot: {
    box: { x: [-0.45, 0.55], y: [0, 0.7], z: [-0.05, 0.3] },
    direction: [0.25, 0.1, 1.0],
    margin: 1.12,
    focus: [0, -0.04, 0],
  },
  leg: {
    box: { x: [-0.55, 0.6], y: [0, 1.08], z: [-0.05, 0.35] },
    direction: [-0.1, 0.08, 1.0],
    margin: 1.06,
    focus: [0, -0.02, 0],
  },
  behind: {
    box: { x: [-0.6, 0.6], y: [0, 1.9], z: [-0.35, 0.45] },
    direction: [-1.0, 0.3, 0.1],
    margin: 1.06,
    focus: [0, -0.1, 0],
  },
  front: {
    box: { x: [-0.35, 0.45], y: [0.85, 1.85], z: [-0.4, 0.4] },
    direction: [1.0, 0.2, 0.05],
    margin: 1.08,
    focus: [0, 0, 0],
  },
  above: {
    box: { x: [-0.45, 0.5], y: [0.8, 1.85], z: [-0.42, 0.42] },
    direction: [0.1, 1.0, 0.25],
    margin: 1.1,
    focus: [0, 0, 0],
  },
  wide: {
    box: { x: [-1.6, 1.6], y: [0, 2.0], z: [-0.6, 0.6] },
    direction: [0.3, 0.12, 1.0],
    margin: 2.0,
    focus: [0, 0, 0],
  },
};

function corners(box: Box3): Vector3[] {
  return [0, 1, 2, 3, 4, 5, 6, 7].map(
    (bits) =>
      new Vector3(
        bits & 1 ? box.max.x : box.min.x,
        bits & 2 ? box.max.y : box.min.y,
        bits & 4 ? box.max.z : box.min.z,
      ),
  );
}

export function frameAround(
  box: Box3,
  target: Vector3,
  direction: Vector3,
  slopes: FramingSlopes,
  margin: number,
): CameraPose {
  const forward = direction.clone().negate();
  const right = new Vector3().crossVectors(forward, UP).normalize();
  const up = new Vector3().crossVectors(right, forward);
  const vertical = slopes.vertical / margin;
  const horizontal = slopes.horizontal / margin;
  const distance = corners(box).reduce((required, corner) => {
    const offset = corner.sub(target);
    const toward = offset.dot(direction);
    const reach = Math.max(
      Math.abs(offset.dot(up)) / vertical,
      Math.abs(offset.dot(right)) / horizontal,
    );
    return Math.max(required, toward + reach);
  }, 0);
  return { position: target.clone().addScaledVector(direction, distance), target };
}

export function shotPose(shot: RunShot, slopes: FramingSlopes): CameraPose {
  const box = regionFromSpec(shot.box);
  const target = box.getCenter(new Vector3()).add(new Vector3(...shot.focus));
  return frameAround(box, target, new Vector3(...shot.direction).normalize(), slopes, shot.margin);
}

function view(shot: RunShot): CustomView {
  return { follow: 'position', distance: ZOOM_LIMITS, pose: (slopes) => shotPose(shot, slopes) };
}

export const CAMERA_VIEWS: Readonly<Record<CameraView, CustomView>> = {
  hero: view(RUN_SHOTS.hero),
  foot: view(RUN_SHOTS.foot),
  leg: view(RUN_SHOTS.leg),
  behind: view(RUN_SHOTS.behind),
  front: view(RUN_SHOTS.front),
  above: view(RUN_SHOTS.above),
  wide: view(RUN_SHOTS.wide),
};

export const BOUNDS_REGIONS: readonly RegionId[] = ['body', 'roadAhead'];

export function cameraFor(camera: CameraView, lookFrom: 'front' | 'above'): CameraView {
  return camera === 'front' ? lookFrom : camera;
}
