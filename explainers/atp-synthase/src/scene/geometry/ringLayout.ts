import { C_RING } from '../../model/scale';
import { HUMAN_BLADE_COUNT } from '../../model/rotor';
import { BLADE } from '../constants';

export interface RingLayout {
  readonly bladeCount: number;
  readonly outerHelixCentre: number;
  readonly innerHelixCentre: number;
  readonly outerRadius: number;
  readonly innerRadius: number;
  readonly carboxylRadius: number;
  readonly growth: number;
}

const HUMAN_OUTER_HELIX = C_RING.outerRadius - BLADE.outerHelixRadius;
const HUMAN_INNER_HELIX = C_RING.innerRadius + BLADE.innerHelixRadius;

export function ringLayout(bladeCount: number): RingLayout {
  const scale = bladeCount / HUMAN_BLADE_COUNT;
  const outerHelixCentre = HUMAN_OUTER_HELIX * scale;
  const innerHelixCentre = HUMAN_INNER_HELIX * scale;
  const outerRadius = outerHelixCentre + BLADE.outerHelixRadius;
  return {
    bladeCount,
    outerHelixCentre,
    innerHelixCentre,
    outerRadius,
    innerRadius: innerHelixCentre - BLADE.innerHelixRadius,
    carboxylRadius: outerRadius - BLADE.carboxylDepth,
    growth: outerRadius - C_RING.outerRadius,
  };
}
