import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { LAYER_IDS, LAYOUT_IDS, SUN_MOMENT_IDS } from '../ids';
import type { SunMomentId } from '../ids';
import { SUN_MOMENTS } from '../model';
import type { SolarPanelStoreState } from '../state';

const NOTHING_CURRENT = '';
const MOMENT_TOLERANCE_MIN = 1;

function momentAt(state: SolarPanelStoreState): SunMomentId | undefined {
  return SUN_MOMENT_IDS.find(
    (id) => Math.abs(SUN_MOMENTS[id] - state.phase) <= MOMENT_TOLERANCE_MIN,
  );
}

function seekMoment(state: SolarPanelStoreState, moment: SunMomentId): void {
  state.pause();
  state.setPhase(SUN_MOMENTS[moment]);
}

export const CHAPTER_ACTIONS: Record<string, ChapterAction<SolarPanelStoreState>> = {
  moment: {
    run: (state, value) => seekMoment(state, parseOption(value, SUN_MOMENT_IDS)),
    current: (state) => momentAt(state) ?? NOTHING_CURRENT,
  },
  layer: {
    run: (state, value) => state.setLayer(parseOption(value, LAYER_IDS)),
    current: (state) => state.layer,
  },
  layout: {
    run: (state, value) => state.setLayout(parseOption(value, LAYOUT_IDS)),
    current: (state) => state.layout,
  },
  followDay: {
    run: (state) => state.setTemperature(null),
  },
};
