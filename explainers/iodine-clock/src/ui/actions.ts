import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { MIX_CHOICE_IDS } from '../ids';
import type { ChapterActionId } from '../ids';
import type { ClockStoreState } from '../state';
import { applyScale } from './dock';

const NOTHING_CURRENT = '';

export const CHAPTER_ACTIONS: Record<ChapterActionId, ChapterAction<ClockStoreState>> = {
  scale: {
    run: applyScale,
    current: (state) => state.scale,
  },
  mix: {
    run: (state, value) => {
      parseOption(value, MIX_CHOICE_IDS);
      state.mixAgain();
    },
    current: () => NOTHING_CURRENT,
  },
};
