import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { GLIDER_TYPES } from '../model';
import type { GliderStoreState } from '../state';

export const CHAPTER_ACTIONS: Record<string, ChapterAction<GliderStoreState>> = {
  glider: {
    run: (state, value) => state.setGlider(parseOption(value, GLIDER_TYPES)),
    current: (state) => state.glider,
  },
};
