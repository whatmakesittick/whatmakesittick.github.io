import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { FOOD_IDS, NOSE_CHOICE_IDS, RECIPE_IDS, SNIFF_IDS } from '../ids';
import type { ChapterActionId } from '../ids';
import { recipeOf } from '../model';
import type { FlavorStoreState } from '../state';
import { applyScale } from './dock';

const NOTHING_CURRENT = '';

export const CHAPTER_ACTIONS: Record<ChapterActionId, ChapterAction<FlavorStoreState>> = {
  scale: {
    run: applyScale,
    current: (state) => state.scale,
  },
  nose: {
    run: (state, value) => {
      state.setView({ pinched: parseOption(value, NOSE_CHOICE_IDS) === 'pinched' });
    },
    current: (state) => (state.view.pinched ? 'pinched' : 'open'),
  },
  food: {
    run: (state, value) => state.setFlavor(parseOption(value, FOOD_IDS)),
    current: (state) => (state.flavor === 'desk' ? NOTHING_CURRENT : state.flavor),
  },
  sniff: {
    run: (state, value) => state.setSniff(parseOption(value, SNIFF_IDS)),
    current: (state) => state.sniff,
  },
  recipe: {
    run: (state, value) => state.loadRecipe(parseOption(value, RECIPE_IDS)),
    current: (state) => recipeOf(state.desk) ?? NOTHING_CURRENT,
  },
};
