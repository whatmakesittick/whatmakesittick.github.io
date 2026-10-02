import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { COMPARISON_IDS, LOAD_IDS, MOMENT_IDS, SENSOR_MODE_IDS } from '../ids';
import type { MomentId } from '../ids';
import { MOMENTS } from '../model';
import type { ReaperStoreState } from '../state';

const NOTHING_CURRENT = '';
const MOMENT_TOLERANCE_UNITS = 0.5;

function momentAt(state: ReaperStoreState): MomentId | undefined {
  return MOMENT_IDS.find(
    (moment) => Math.abs(MOMENTS[moment] - state.phase) <= MOMENT_TOLERANCE_UNITS,
  );
}

export const CHAPTER_ACTIONS: Record<string, ChapterAction<ReaperStoreState>> = {
  moment: {
    run: (state, value) => state.seekMoment(parseOption(value, MOMENT_IDS)),
    current: (state) => momentAt(state) ?? NOTHING_CURRENT,
  },
  load: {
    run: (state, value) => state.setLoad(parseOption(value, LOAD_IDS)),
    current: (state) => state.load,
  },
  comparison: {
    run: (state, value) => state.setComparison(parseOption(value, COMPARISON_IDS)),
    current: (state) => state.comparison,
  },
  sensorMode: {
    run: (state, value) => state.setSensorMode(parseOption(value, SENSOR_MODE_IDS)),
    current: (state) => state.sensorMode,
  },
};
