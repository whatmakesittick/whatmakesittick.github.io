import { CROWN_WHEEL_CENTRE, WHEEL_CENTRES } from '../../../model/layout';
import { WINDING } from '../../../model/train';
import { SAW_TOOTH_CENTRE_SHARE } from '../../constants';
import { toothPitch } from '../../geometry/gear';
import { meshPhase } from '../../geometry/meshing';

export interface WindingPhases {
  readonly ratchet: number;
  readonly crownWheel: number;
}

export function windingPhases(): WindingPhases {
  const barrel = WHEEL_CENTRES.barrel;
  const direction = Math.atan2(CROWN_WHEEL_CENTRE.y - barrel.y, CROWN_WHEEL_CENTRE.x - barrel.x);
  const phase = meshPhase(WINDING.crownWheelTeeth, direction);
  const ratchetPitch = toothPitch(WINDING.ratchetTeeth);
  const crownPitch = toothPitch(WINDING.crownWheelTeeth);
  return {
    ratchet: phase.driver - ratchetPitch * SAW_TOOTH_CENTRE_SHARE,
    crownWheel: phase.driven - crownPitch * SAW_TOOTH_CENTRE_SHARE,
  };
}
