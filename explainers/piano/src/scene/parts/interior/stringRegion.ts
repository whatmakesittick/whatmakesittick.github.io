import type { RegionSpec } from '@core/scene/regions';
import { SOUNDBOARD } from '../../../model';
import { TUNING_PIN } from './constants';
import { middleOf, stringSpot, tuningPinSpot } from './labelSpots';

const FRAME = {
  halfWidth: 0.05,
  trebleBias: -0.02,
  beforePins: 0.02,
  behindHitch: 0.05,
  minDepth: 0.36,
  belowBoard: 0.02,
} as const;

export function stringRegionSpec(key: number): RegionSpec {
  const [x] = stringSpot(key);
  const front = tuningPinSpot(key)[2] + FRAME.beforePins;
  const back = Math.min(middleOf(key).hitch[2] - FRAME.behindHitch, front - FRAME.minDepth);
  const centre = x + FRAME.trebleBias;
  return {
    x: [centre - FRAME.halfWidth, centre + FRAME.halfWidth],
    y: [SOUNDBOARD.topY - FRAME.belowBoard, TUNING_PIN.top],
    z: [back, front],
  };
}
