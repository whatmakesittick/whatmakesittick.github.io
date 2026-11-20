import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { LOOK_IDS, REVERSER_IDS } from '../ids';
import type { ChapterActionId } from '../ids';
import type { EngineStoreState } from '../state';
import { applyCutaway, applyStreams } from './dock';

export const CHAPTER_ACTIONS: Record<ChapterActionId, ChapterAction<EngineStoreState>> = {
  cutaway: {
    run: applyCutaway,
    current: (state) => state.cutaway,
  },
  streams: {
    run: applyStreams,
    current: (state) => state.streams,
  },
  look: {
    run: (state, value) => state.setLook(parseOption(value, LOOK_IDS)),
    current: (state) => state.look,
  },
  reverser: {
    run: (state, value) => {
      state.setView({ reverser: parseOption(value, REVERSER_IDS) === 'deployed' });
    },
    current: (state) => (state.view.reverser ? 'deployed' : 'stowed'),
  },
};
