import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import {
  FLIGHT_MODE_IDS,
  MOMENT_IDS,
  MOVE_IDS,
  PACKET_RATES,
  SPEEDSTER_IDS,
  VIDEO_IDS,
} from '../ids';
import type { MomentId, PacketRate } from '../ids';
import { MOMENTS } from '../model';
import type { FpvStoreState } from '../state';

const NOTHING_CURRENT = '';
export const MOMENT_TOLERANCE_S = 0.3;

const PACKET_RATE_VALUES = PACKET_RATES.map(String);

function momentAt(state: FpvStoreState): MomentId | undefined {
  return MOMENT_IDS.find((moment) => Math.abs(MOMENTS[moment] - state.phase) <= MOMENT_TOLERANCE_S);
}

function parsePacketRate(value: string): PacketRate {
  return Number(parseOption(value, PACKET_RATE_VALUES)) as PacketRate;
}

export const CHAPTER_ACTIONS: Record<string, ChapterAction<FpvStoreState>> = {
  moment: {
    run: (state, value) => state.seekMoment(parseOption(value, MOMENT_IDS)),
    current: (state) => momentAt(state) ?? NOTHING_CURRENT,
  },
  move: {
    run: (state, value) => state.setMove(parseOption(value, MOVE_IDS)),
    current: (state) => state.move,
  },
  flightMode: {
    run: (state, value) => state.setFlightMode(parseOption(value, FLIGHT_MODE_IDS)),
    current: (state) => state.flightMode,
  },
  packetRate: {
    run: (state, value) => state.setPacketRate(parsePacketRate(value)),
    current: (state) => String(state.packetRate),
  },
  speedster: {
    run: (state, value) => state.setSpeedster(parseOption(value, SPEEDSTER_IDS)),
    current: (state) => state.speedster,
  },
  video: {
    run: (state, value) => state.setVideo(parseOption(value, VIDEO_IDS)),
    current: (state) => state.video,
  },
};
