import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import type { ChapterActionId } from '../ids';
import type { ThrusterCarStoreState } from '../state';
import { applyGasChoice, applyTankChoice, tankChoiceOf } from './dock';

const REPLAY_OPTIONS = ['run'] as const;
const RUN_START = 0;
const NOTHING_CURRENT = '';

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
};
