import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { BENCHMARK_IDS, DISTANCE_IDS, MOMENT_IDS, OUTAGE_IDS } from '../ids';
import type { ChapterActionId, MomentId } from '../ids';
import { MOMENTS } from '../model';
import type { DataCenterStoreState } from '../state';
import { applyCoolingChoice, applyLoadChoice } from './dock';

const NOTHING_CURRENT = '';

function seekMoment(state: DataCenterStoreState, moment: MomentId): void {
  state.pause();
  state.setPhase(MOMENTS[moment]);
}

function pausedMoment(state: DataCenterStoreState): MomentId | undefined {
  if (state.playing) return undefined;
  return MOMENT_IDS.find((moment) => MOMENTS[moment] === state.phase);
}

function cutGrid(state: DataCenterStoreState, value: string): void {
  parseOption(value, OUTAGE_IDS);
  state.cutGrid();
}

export const CHAPTER_ACTIONS: Record<ChapterActionId, ChapterAction<DataCenterStoreState>> = {
  moment: {
    run: (state, value) => seekMoment(state, parseOption(value, MOMENT_IDS)),
    current: (state) => pausedMoment(state) ?? NOTHING_CURRENT,
  },
  outage: {
    run: cutGrid,
    current: () => NOTHING_CURRENT,
  },
  load: {
    run: applyLoadChoice,
    current: (state) => state.load,
  },
  distance: {
    run: (state, value) => state.setDistance(parseOption(value, DISTANCE_IDS)),
    current: (state) => state.distance,
  },
  cooling: {
    run: applyCoolingChoice,
    current: (state) => state.cooling,
  },
  benchmark: {
    run: (state, value) => state.setBenchmark(parseOption(value, BENCHMARK_IDS)),
    current: (state) => state.benchmark,
  },
};
