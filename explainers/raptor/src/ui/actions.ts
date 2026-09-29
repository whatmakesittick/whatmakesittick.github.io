import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { ENGINE_IDS, MOMENT_IDS, PROPELLANT_IDS } from '../ids';
import type { MomentId } from '../ids';
import { MOMENTS } from '../model/phases';
import type { RaptorStoreState } from '../state';

const NOTHING_CURRENT = '';
const MOMENT_TOLERANCE_SECONDS = 0.5;

function momentAt(state: RaptorStoreState): MomentId | undefined {
  return MOMENT_IDS.find(
    (moment) => Math.abs(MOMENTS[moment] - state.phase) <= MOMENT_TOLERANCE_SECONDS,
  );
}

export const CHAPTER_ACTIONS: Record<string, ChapterAction<RaptorStoreState>> = {
  propellant: {
    run: (state, value) => state.setPropellant(parseOption(value, PROPELLANT_IDS)),
    current: (state) => state.propellant,
  },
  engine: {
    run: (state, value) => state.setEngine(parseOption(value, ENGINE_IDS)),
    current: (state) => state.engine,
  },
  moment: {
    run: (state, value) => state.setPhase(MOMENTS[parseOption(value, MOMENT_IDS)]),
    current: (state) => momentAt(state) ?? NOTHING_CURRENT,
  },
};
