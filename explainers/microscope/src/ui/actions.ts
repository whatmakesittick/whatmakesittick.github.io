import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { EYEPIECE_IDS, OBJECTIVE_IDS } from '../model';
import type { MicroscopeStoreState } from '../state';

export const CHAPTER_ACTIONS: Record<string, ChapterAction<MicroscopeStoreState>> = {
  objective: {
    run: (state, value) => state.setObjective(parseOption(value, OBJECTIVE_IDS)),
    current: (state) => state.objective,
  },
  eyepiece: {
    run: (state, value) => state.setEyepiece(parseOption(value, EYEPIECE_IDS)),
    current: (state) => state.eyepiece,
  },
};
