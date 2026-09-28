import type { Box3 } from 'three';
import type { CustomView, FramedView, ViewSpec } from '@core/scene/cameraViews';
import type { RegionId } from '../ids';
import type { CameraView } from '../state';
import { skyViewPose } from './geometry/skyView';

type FramedViewId = Exclude<CameraView, 'sky'>;

export type RegionLookup = (id: RegionId) => Box3 | null;

export const WIDE_DISTANCE = { min: 60, max: 4000 } as const;
export const CLOSE_DISTANCE = { min: 20, max: 2500 } as const;
export const SKY_DISTANCE = { min: 20, max: 7500 } as const;

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
    direction: [1, 0.35, 0.45],
    margin: 1.4,
    distance: CLOSE_DISTANCE,
  },
};

function skyView(region: RegionLookup): CustomView {
  return {
    pose: (slopes) => {
      const array = region('array');
      return array ? skyViewPose(array, slopes) : null;
    },
    distance: SKY_DISTANCE,
  };
}

export function cameraViews(region: RegionLookup): Record<CameraView, ViewSpec<RegionId>> {
  return { ...FRAMED_VIEWS, sky: skyView(region) };
}
