import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { ARMS_IDS, LOOK_IDS, PACE_IDS } from '../ids';
import type { ChapterActionId } from '../ids';
import type { RunStoreState } from '../state';

export const CHAPTER_ACTIONS: Record<ChapterActionId, ChapterAction<RunStoreState>> = {
  pace: {
    run: (state, value) => state.setPace(parseOption(value, PACE_IDS)),
    current: (state) => state.pace,
  },
  arms: {
    run: (state, value) => state.setArms(parseOption(value, ARMS_IDS)),
    current: (state) => state.arms,
  },
  look: {
    run: (state, value) => state.setLookFrom(parseOption(value, LOOK_IDS)),
    current: (state) => state.lookFrom,
  },
};
