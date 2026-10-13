import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { BRAKE_CHOICE_IDS, KICKBACK_CHOICE_IDS, START_CHOICE_IDS } from '../ids';
import type { BrakeChoiceId, ChapterActionId, KickbackChoiceId } from '../ids';
import type { ChainsawStoreState } from '../state';
import { applyThrottleChoice, throttleChoiceOf } from './dock';

const BRAKE_ON: BrakeChoiceId = 'on';
const BRAKE_OFF: BrakeChoiceId = 'off';
const STRONG: KickbackChoiceId = 'strong';
const NOTHING_CURRENT = '';

export const CHAPTER_ACTIONS: Record<ChapterActionId, ChapterAction<ChainsawStoreState>> = {
  throttle: {
    run: applyThrottleChoice,
    current: (state) => throttleChoiceOf(state.throttle),
  },
  brake: {
    run: (state, value) => state.setBrake(parseOption(value, BRAKE_CHOICE_IDS) === BRAKE_ON),
    current: (state) => (state.brake ? BRAKE_ON : BRAKE_OFF),
  },
  kickback: {
    run: (state, value) => {
      parseOption(value, KICKBACK_CHOICE_IDS);
      state.startKickback();
    },
    current: (state) => (state.kickback ? STRONG : NOTHING_CURRENT),
  },
  start: {
    run: (_state, value) => {
      parseOption(value, START_CHOICE_IDS);
    },
    current: () => NOTHING_CURRENT,
  },
};
