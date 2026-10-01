import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { COMPARISON_IDS, GAS_PORT_IDS, MOMENT_IDS } from '../ids';
import type { MomentId } from '../ids';
import { MOMENTS, unitsAt } from '../model';
import type { RifleStoreState } from '../state';

const NOTHING_CURRENT = '';
const MOMENT_TOLERANCE_UNITS = 0.5;

function momentAt(state: RifleStoreState): MomentId | undefined {
  return MOMENT_IDS.find(
    (moment) => Math.abs(unitsAt(MOMENTS[moment]) - state.phase) <= MOMENT_TOLERANCE_UNITS,
  );
}

export const CHAPTER_ACTIONS: Record<string, ChapterAction<RifleStoreState>> = {
  moment: {
    run: (state, value) => state.seekTime(MOMENTS[parseOption(value, MOMENT_IDS)]),
    current: (state) => momentAt(state) ?? NOTHING_CURRENT,
  },
  gasPort: {
    run: (state, value) => state.setGasPort(parseOption(value, GAS_PORT_IDS)),
    current: (state) => state.gasPort,
  },
  comparison: {
    run: (state, value) => state.setComparison(parseOption(value, COMPARISON_IDS)),
    current: (state) => state.comparison,
  },
};
