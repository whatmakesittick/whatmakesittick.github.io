import { HEAD, VALVE, VALVE_TRAIN } from '../constants';

export interface ValveTrainHeights {
  springBase: number;
  retainerBottom: number;
  stemTop: number;
  tappetTop: number;
  rollerCenter: number;
  camCenter: number;
}

export function valveTrainHeights(): ValveTrainHeights {
  const springBase = HEAD.deckHeight + VALVE.seatWasherHeight;
  const retainerBottom = springBase + VALVE_TRAIN.springRestLength;
  const stemTop = retainerBottom + VALVE_TRAIN.retainerHeight;
  const tappetTop = stemTop + VALVE_TRAIN.tappetHeight;
  const rollerCenter = tappetTop + VALVE_TRAIN.rollerRadius;
  const camCenter = rollerCenter + VALVE_TRAIN.rollerRadius + VALVE_TRAIN.camBaseRadius;
  return { springBase, retainerBottom, stemTop, tappetTop, rollerCenter, camCenter };
}
