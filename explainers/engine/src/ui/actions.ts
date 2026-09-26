import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { ENGINE_LAYOUTS, ENGINE_TYPES, STROKES } from '../model';
import type { EngineStoreState } from '../state';

export const CHAPTER_ACTIONS: Record<string, ChapterAction<EngineStoreState>> = {
  'jump-stroke': {
    run: (state, value) => state.jumpToPhase(parseOption(value, STROKES)),
  },
  'engine-type': {
    run: (state, value) => state.setEngineType(parseOption(value, ENGINE_TYPES)),
    current: (state) => state.engineType,
  },
  layout: {
    run: (state, value) => state.setLayout(parseOption(value, ENGINE_LAYOUTS)),
    current: (state) => state.layout,
  },
};
