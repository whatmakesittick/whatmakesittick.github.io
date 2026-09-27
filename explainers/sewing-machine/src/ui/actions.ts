import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { TENSIONS } from '../model';
import type { SewingStoreState } from '../state';
import { STITCH_LENGTH_MM, STITCH_LENGTH_VALUES, nearestStitchLength } from './stitchLengths';

export const CHAPTER_ACTIONS: Record<string, ChapterAction<SewingStoreState>> = {
  tension: {
    run: (state, value) => state.setTension(parseOption(value, TENSIONS)),
    current: (state) => state.tension,
  },
  'stitch-length': {
    run: (state, value) => state.setStitchLength(Number(parseOption(value, STITCH_LENGTH_VALUES))),
    current: (state) => String(STITCH_LENGTH_MM[nearestStitchLength(state.stitchLength)]),
  },
};
