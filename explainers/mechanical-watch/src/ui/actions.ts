import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { BEAT_RATE_IDS, MOMENT_IDS, WHEEL_IDS } from '../ids';
import type { MomentId } from '../ids';
import { momentPhase } from '../model';
import { RESERVE_RANGE, amplitudeOf } from '../state';
import type { WatchStoreState } from '../state';

const NOTHING_CURRENT = '';
const MOMENT_TOLERANCE_DEG = 0.5;

function momentAt(state: WatchStoreState): MomentId | undefined {
  const amplitude = amplitudeOf(state);
  return MOMENT_IDS.find(
    (id) => Math.abs(momentPhase(id, amplitude) - state.phase) <= MOMENT_TOLERANCE_DEG,
  );
}

function seekMoment(state: WatchStoreState, moment: MomentId): void {
  state.pause();
  state.setPhase(momentPhase(moment, amplitudeOf(state)));
}

export const CHAPTER_ACTIONS: Record<string, ChapterAction<WatchStoreState>> = {
  wheel: {
    run: (state, value) => {
      state.setWheel(parseOption(value, WHEEL_IDS));
      state.resetCamera();
    },
    current: (state) => state.wheel,
  },
  moment: {
    run: (state, value) => seekMoment(state, parseOption(value, MOMENT_IDS)),
    current: (state) => momentAt(state) ?? NOTHING_CURRENT,
  },
  beatRate: {
    run: (state, value) => state.setBeatRate(parseOption(value, BEAT_RATE_IDS)),
    current: (state) => state.beatRate,
  },
  wind: {
    run: (state) => state.setReserve(RESERVE_RANGE.max),
  },
};
