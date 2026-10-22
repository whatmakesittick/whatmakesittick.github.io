import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { BRAKE_MODE_IDS, COMPARE_IDS, MOMENT_IDS, NUDGE_IDS } from '../ids';
import type { ChapterActionId, MomentId } from '../ids';
import { MOMENTS } from '../model';
import type { MaglevTrainStoreState } from '../state';
import { applyTopSpeedChoice } from './dock';

const NOTHING_CURRENT = '';

function seekMoment(state: MaglevTrainStoreState, moment: MomentId): void {
  state.pause();
  state.setPhase(MOMENTS[moment]);
}

function pausedMoment(state: MaglevTrainStoreState): MomentId | undefined {
  if (state.playing) return undefined;
  return MOMENT_IDS.find((moment) => MOMENTS[moment] === state.phase);
}

export const CHAPTER_ACTIONS: Record<ChapterActionId, ChapterAction<MaglevTrainStoreState>> = {
  topSpeed: {
    run: applyTopSpeedChoice,
    current: (state) => state.topSpeed,
  },
  brakeMode: {
    run: (state, value) => state.setBrakeMode(parseOption(value, BRAKE_MODE_IDS)),
    current: (state) => state.brakeMode,
  },
  nudge: {
    run: (state, value) => state.nudgeTrain(parseOption(value, NUDGE_IDS)),
    current: () => NOTHING_CURRENT,
  },
  compare: {
    run: (state, value) => state.setCompare(parseOption(value, COMPARE_IDS)),
    current: (state) => state.compare,
  },
  moment: {
    run: (state, value) => seekMoment(state, parseOption(value, MOMENT_IDS)),
    current: (state) => pausedMoment(state) ?? NOTHING_CURRENT,
  },
};
