import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import {
  BIT_IDS,
  LAYER_STOP_IDS,
  SECTION_IDS,
  layerStopAt,
  layerStopDepth,
  sectionAt,
  sectionStartDepth,
} from '../model';
import type { OilRigStoreState } from '../state';

const NO_STOP = '';

function seek(state: OilRigStoreState, depth: number): void {
  state.pause();
  state.setPhase(depth);
}

export const CHAPTER_ACTIONS: Record<string, ChapterAction<OilRigStoreState>> = {
  bit: {
    run: (state, value) => state.setBit(parseOption(value, BIT_IDS)),
    current: (state) => state.bit,
  },
  section: {
    run: (state, value) => seek(state, sectionStartDepth(parseOption(value, SECTION_IDS))),
    current: (state) => sectionAt(state.phase).id,
  },
  layer: {
    run: (state, value) => seek(state, layerStopDepth(parseOption(value, LAYER_STOP_IDS))),
    current: (state) => layerStopAt(state.phase) ?? NO_STOP,
  },
  mudPlan: {
    run: (state) => state.setMudWeight(null),
  },
};
