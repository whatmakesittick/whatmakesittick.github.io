import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { MOMENT_IDS } from '../ids';
import type { ChapterActionId, MomentId } from '../ids';
import { MOMENTS } from '../model';
import type { ThrusterCarStoreState } from '../state';
import { applyGasChoice, applyTankChoice, tankChoiceOf } from './dock';

const REPLAY_OPTIONS = ['run'] as const;
const RUN_START = 0;
const NOTHING_CURRENT = '';
export const MOMENT_TOLERANCE_S = 0.05;

function seekMoment(state: ThrusterCarStoreState, moment: MomentId): void {
  state.pause();
  state.setPhase(MOMENTS[moment]);
}

function momentAt(state: ThrusterCarStoreState): MomentId | undefined {
  return MOMENT_IDS.find((moment) => Math.abs(MOMENTS[moment] - state.phase) <= MOMENT_TOLERANCE_S);
}

export const CHAPTER_ACTIONS: Record<ChapterActionId, ChapterAction<ThrusterCarStoreState>> = {
  gas: {
    run: applyGasChoice,
    current: (state) => state.gas,
  },
  tank: {
    run: applyTankChoice,
    current: tankChoiceOf,
  },
  replay: {
    run: (state, value) => {
      parseOption(value, REPLAY_OPTIONS);
      state.setPhase(RUN_START);
      state.play();
    },
    current: () => NOTHING_CURRENT,
  },
  moment: {
    run: (state, value) => seekMoment(state, parseOption(value, MOMENT_IDS)),
    current: (state) => momentAt(state) ?? NOTHING_CURRENT,
  },
};
