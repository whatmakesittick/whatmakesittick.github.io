import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { EVENT_IDS, RING_IDS, TRAINING_IDS } from '../ids';
import type { AtpSynthaseStoreState } from '../state';

export const CHAPTER_ACTIONS: Record<string, ChapterAction<AtpSynthaseStoreState>> = {
  ring: {
    run: (state, value) => {
      state.setRing(parseOption(value, RING_IDS));
      state.resetCamera();
    },
    current: (state) => state.ring,
  },
  event: {
    run: (state, value) => state.setEvent(parseOption(value, EVENT_IDS)),
    current: (state) => state.event,
  },
  training: {
    run: (state, value) => {
      state.setTraining(parseOption(value, TRAINING_IDS));
      state.resetCamera();
    },
    current: (state) => state.training,
  },
};
