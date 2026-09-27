import { regionFromSpec } from '@core/scene/regions';
import type { RegionSpec } from '@core/scene/regions';
import type { Box3, Matrix4 } from 'three';
import { IMAGE_PLANE, STATIONS } from '../model';
import type { OpticalLayout } from '../model';
import { BASE, BASE_TOP, BENCH_LEVEL, EYE, KNOBS, STAGE, STAGE_TOP } from './constants';

export type RegionId =
  'instrument' | 'illumination' | 'objective' | 'eyepiece' | 'aperture' | 'stage';

const APERTURE = { below: 0.6, above: 0.25, pad: 0.5, widthShare: 1.25 } as const;
const ILLUMINATION_REACH = { side: 20, back: -40, front: 40 } as const;
const OBJECTIVE_REACH = { back: -36, front: 36, side: 18, below: 6, above: 16 } as const;
const EYEPIECE_REACH = { back: -24, front: 40, side: 20, below: 58, above: 12 } as const;
const STAGE_REACH = { back: -100, front: 80, side: 45, below: 25, above: 6 } as const;

function eyeTop(layout: OpticalLayout): number {
  return layout.eyeLens + EYE.centerAboveLens + EYE.radius;
}

function apertureSpec(layout: OpticalLayout): RegionSpec {
  const lensHeight = layout.objectiveLens - layout.specimen;
  const reach = layout.objectiveAperture * APERTURE.widthShare + APERTURE.pad;
  return {
    x: [-reach / 2, reach / 2],
    y: [
      layout.specimen - APERTURE.below * lensHeight - APERTURE.pad,
      layout.objectiveLens + APERTURE.above * lensHeight + APERTURE.pad,
    ],
    z: [-reach, reach],
  };
}

function regionSpec(id: RegionId, layout: OpticalLayout): RegionSpec {
  switch (id) {
    case 'instrument':
      return {
        x: [-BASE.halfWidth, BASE.halfWidth],
        y: [BENCH_LEVEL, eyeTop(layout)],
        z: [BASE.back, BASE.front],
      };
    case 'illumination':
      return {
        x: [-ILLUMINATION_REACH.side, ILLUMINATION_REACH.side],
        y: [BASE_TOP, STAGE_TOP + STAGE.thickness / 4],
        z: [ILLUMINATION_REACH.back, ILLUMINATION_REACH.front],
      };
    case 'objective':
      return {
        x: [-OBJECTIVE_REACH.side, OBJECTIVE_REACH.side],
        y: [STATIONS.specimen - OBJECTIVE_REACH.below, IMAGE_PLANE + OBJECTIVE_REACH.above],
        z: [OBJECTIVE_REACH.back, OBJECTIVE_REACH.front],
      };
    case 'eyepiece':
      return {
        x: [-EYEPIECE_REACH.side, EYEPIECE_REACH.side],
        y: [IMAGE_PLANE - EYEPIECE_REACH.below, eyeTop(layout) + EYEPIECE_REACH.above],
        z: [EYEPIECE_REACH.back, EYEPIECE_REACH.front],
      };
    case 'aperture':
      return apertureSpec(layout);
    case 'stage':
      return {
        x: [-STAGE_REACH.side, STAGE_REACH.side],
        y: [KNOBS.height - STAGE_REACH.below, STAGE_TOP + STAGE_REACH.above],
        z: [STAGE_REACH.back, STAGE_REACH.front],
      };
  }
}

export function regionBox(id: RegionId, layout: OpticalLayout, rootMatrix: Matrix4): Box3 {
  return regionFromSpec(regionSpec(id, layout)).applyMatrix4(rootMatrix);
}
