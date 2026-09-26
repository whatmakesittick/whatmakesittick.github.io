import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { FLIGHT_MODES } from '../model';
import type { HelicopterStoreState } from '../state';

export const CHAPTER_ACTIONS: Record<string, ChapterAction<HelicopterStoreState>> = {
  'flight-mode': {
    run: (state, value) => state.setFlightMode(parseOption(value, FLIGHT_MODES)),
    current: (state) => state.flightMode,
  },
};
