import { Box3, Vector3 } from 'three';
import type { CustomView, Direction, FramedView, ViewSpec } from '@core/scene/cameraViews';
import { frameBox } from '@core/scene/frameBox';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import type { RegionId } from '../ids';
import {
  SKY_RADIUS_CM,
  SOLAR_NOON_MIN,
  SUN_DISC_RADIUS_CM,
  SUNRISE_MIN,
  SUNSET_MIN,
  SUN_ARC_RADIUS_CM,
  TERRACE,
  sunDirection,
} from '../model';
import type { CameraView } from '../state';

type FramedViewId = Exclude<CameraView, 'sky'>;

export type RegionLookup = (id: RegionId) => Box3 | null;

export const WIDE_DISTANCE = { min: 60, max: 4000 } as const;
export const CLOSE_DISTANCE = { min: 20, max: 2500 } as const;

export const SKY_VIEW = {
  direction: [0.25, 0.32, -1] as Direction,
  margin: 1.06,
  maxDistance: SKY_RADIUS_CM * 0.92,
  arcStepMin: 15,
  aimShare: 0.45,
  aimSharePerSlope: 1.5,
} as const;

const FRAMED_VIEWS: Record<FramedViewId, FramedView<RegionId>> = {
  roof: { region: 'house', direction: [0.55, 0.45, 1], margin: 1.05, distance: WIDE_DISTANCE },
  stack: { region: 'stack', direction: [-0.6, 0.5, 0.8], margin: 1.1, distance: CLOSE_DISTANCE },
  cell: { region: 'slice', direction: [-0.45, 0.4, 1], margin: 1.1, distance: CLOSE_DISTANCE },
  strings: {
    region: 'panel',
    direction: [0.15, 0.82, 0.57],
    margin: 1.08,
    distance: CLOSE_DISTANCE,
  },
  inverter: {
    region: 'inverter',
    direction: [0.3, 0.2, 1],
    margin: 1.4,
    distance: CLOSE_DISTANCE,
  },
};

function sunPosition(minute: number, centre: Vector3): Vector3 {
  const [x, y, z] = sunDirection(minute);
  return new Vector3(x, y, z).multiplyScalar(SUN_ARC_RADIUS_CM).add(centre);
}

export function sunArcBox(centre: Vector3): Box3 {
  const box = new Box3();
  for (let minute = SUNRISE_MIN; minute <= SUNSET_MIN; minute += SKY_VIEW.arcStepMin) {
    box.expandByPoint(sunPosition(minute, centre));
  }
  return box.expandByScalar(SUN_DISC_RADIUS_CM);
}

export function skyPose(array: Box3, slopes: FramingSlopes): CameraPose {
  const centre = array.getCenter(new Vector3());
  const ground = centre.clone().setY(TERRACE.y);
  const direction = new Vector3(...SKY_VIEW.direction).normalize();
  const framed = frameBox(sunArcBox(ground).union(array), direction, slopes, SKY_VIEW.margin);
  const distance = Math.min(framed.position.distanceTo(framed.target), SKY_VIEW.maxDistance);
  const share = Math.min(SKY_VIEW.aimShare, slopes.vertical * SKY_VIEW.aimSharePerSlope);
  const target = centre.lerp(sunPosition(SOLAR_NOON_MIN, ground), share);
  return { target, position: target.clone().addScaledVector(direction, distance) };
}

function skyView(region: RegionLookup): CustomView {
  return {
    pose: (slopes) => {
      const array = region('array');
      return array ? skyPose(array, slopes) : null;
    },
    distance: WIDE_DISTANCE,
  };
}

export function cameraViews(region: RegionLookup): Record<CameraView, ViewSpec<RegionId>> {
  return { ...FRAMED_VIEWS, sky: skyView(region) };
}
