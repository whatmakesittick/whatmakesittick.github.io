import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import {
  FOLLOW_DAY,
  NACELLE_CHOICE_IDS,
  SITE_WIND_IDS,
  SPACING_CHOICE_IDS,
  WIND_AT_IDS,
  WIND_PRESET_IDS,
} from '../ids';
import type { ChapterActionId, NacelleChoiceId, SpacingD, WindAtId } from '../ids';
import { WIND_PRESETS } from '../model';
import type { WindFarmStoreState } from '../state';

const NOTHING_CURRENT = '';
const OPEN: NacelleChoiceId = 'open';
const CLOSED: NacelleChoiceId = 'closed';

function spacingOf(value: string): SpacingD {
  return Number(parseOption(value, SPACING_CHOICE_IDS)) as SpacingD;
}

function overrideOf(choice: WindAtId): number | null {
  return choice === FOLLOW_DAY ? null : WIND_PRESETS[choice];
}

function windAtOf(override: number | null): WindAtId | typeof NOTHING_CURRENT {
  if (override === null) return FOLLOW_DAY;
  return WIND_PRESET_IDS.find((preset) => WIND_PRESETS[preset] === override) ?? NOTHING_CURRENT;
}

export const CHAPTER_ACTIONS: Record<ChapterActionId, ChapterAction<WindFarmStoreState>> = {
  siteWind: {
    run: (state, value) => state.setSiteWind(parseOption(value, SITE_WIND_IDS)),
    current: (state) => state.siteWind,
  },
  spacing: {
    run: (state, value) => state.setSpacing(spacingOf(value)),
    current: (state) => String(state.spacing),
  },
  nacelle: {
    run: (state, value) =>
      state.setView({ cutaway: parseOption(value, NACELLE_CHOICE_IDS) === OPEN }),
    current: (state) => (state.view.cutaway ? OPEN : CLOSED),
  },
  windAt: {
    run: (state, value) => state.setWindOverride(overrideOf(parseOption(value, WIND_AT_IDS))),
    current: (state) => windAtOf(state.windOverride),
  },
};
