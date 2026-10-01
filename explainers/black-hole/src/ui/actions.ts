import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { BLACK_HOLE_IDS, MOMENT_IDS } from '../ids';
import type { MomentId } from '../ids';
import { MOMENTS } from '../model';
import type { BlackHoleStoreState } from '../state';

const NOTHING_CURRENT = '';
const MOMENT_TOLERANCE_SECONDS = 2;

function momentAt(state: BlackHoleStoreState): MomentId | undefined {
  return MOMENT_IDS.find(
    (moment) => Math.abs(MOMENTS[moment] - state.phase) <= MOMENT_TOLERANCE_SECONDS,
  );
}

export const CHAPTER_ACTIONS: Record<string, ChapterAction<BlackHoleStoreState>> = {
  comparison: {
    run: (state, value) => state.setComparison(parseOption(value, BLACK_HOLE_IDS)),
    current: (state) => state.comparison,
  },
  moment: {
    run: (state, value) => state.setPhase(MOMENTS[parseOption(value, MOMENT_IDS)]),
    current: (state) => momentAt(state) ?? NOTHING_CURRENT,
  },
};
