import { FULL_TURN } from '@core/math';
import { AIR_HANDLERS, ANCHOR_POINTS, CHILLER, DRY_COOLER } from '../../../model';
import { DRY_COOLER_BANK_CENTRE, ROOF_Y, boxTop } from '../../../model';
import { sceneAnchor } from '../context';
import { buildAirHandlers } from './airHandlers';
import { buildChiller } from './chiller';
import { buildDryCoolers, spinFans } from './dryCoolers';
import { partGroup } from './kit';
import type { PieceBuilder } from './kit';
import { PIPE_LABEL, buildFacilityPipes } from './pipeRuns';

const FAN_TOP_SPEED = 2.5 * FULL_TURN;
const FAN_EASE_S = 0.3;
const FAN_SETTLED = 0.01;
const [BANK_X, , BANK_Z] = DRY_COOLER_BANK_CENTRE;

export const buildRoofPlant: PieceBuilder = (context, root) => {
  const fans = [
    buildChiller(context, partGroup(context, 'chiller', root, boxTop(CHILLER))),
    buildDryCoolers(
      context,
      partGroup(context, 'dryCoolers', root, [BANK_X, ROOF_Y + DRY_COOLER.height, BANK_Z]),
    ),
  ];
  const showPipes = buildFacilityPipes(
    context,
    partGroup(context, 'facilityPipes', root, PIPE_LABEL),
  );
  const middle = AIR_HANDLERS[Math.floor(AIR_HANDLERS.length / 2)];
  const handlers = partGroup(context, 'airHandlers', root, boxTop(middle));
  buildAirHandlers(context, handlers);
  sceneAnchor(context, 'roof', root, ANCHOR_POINTS.roof);
  let speed = 0;
  let angle = 0;
  return {
    setState(state) {
      handlers.visible = state.cooling === 'air';
      showPipes(state.cooling);
    },
    animate(frame, state) {
      const target = state.playing ? state.rack.fanShare * FAN_TOP_SPEED : 0;
      speed += (target - speed) * (1 - Math.exp(-frame.delta / FAN_EASE_S));
      if (Math.abs(target - speed) < FAN_SETTLED) speed = target;
      if (speed === 0) return false;
      angle = (angle + speed * frame.delta) % FULL_TURN;
      fans.forEach((set) => spinFans(set, angle));
      return true;
    },
  };
};
