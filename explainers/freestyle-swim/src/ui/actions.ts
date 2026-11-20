import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { BREATH_IDS, HEAD_IDS, KICK_IDS, PACE_IDS } from '../ids';
import type { ChapterActionId, HeadId } from '../ids';
import { effectiveKick } from '../state/derived';
import type { SwimStoreState } from '../state';

const HEAD_UP: HeadId = 'up';
const HEAD_DOWN: HeadId = 'down';

export const CHAPTER_ACTIONS: Record<ChapterActionId, ChapterAction<SwimStoreState>> = {
  pace: {
    run: (state, value) => state.setPace(parseOption(value, PACE_IDS)),
    current: (state) => state.pace,
  },
  kick: {
    run: (state, value) => state.setKick(parseOption(value, KICK_IDS)),
    current: effectiveKick,
  },
  breath: {
    run: (state, value) => state.setBreathing(parseOption(value, BREATH_IDS)),
    current: (state) => state.breathing,
  },
  head: {
    run: (state, value) => state.setHeadUp(parseOption(value, HEAD_IDS) === HEAD_UP),
    current: (state) => (state.headUp ? HEAD_UP : HEAD_DOWN),
  },
};
