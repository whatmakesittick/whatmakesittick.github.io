import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { COMPARE_IDS, MOMENT_IDS, REGISTER_IDS, SOUND_OPTION_IDS } from '../ids';
import type { ChapterActionId, MomentId, SoundOptionId } from '../ids';
import { MOMENTS } from '../model';
import type { PianoStoreState } from '../state';
import { applyPedalChoice, applyTouchChoice } from './dock';

const NOTHING_CURRENT = '';
const SOUND_ON: SoundOptionId = 'on';
const SOUND_OFF: SoundOptionId = 'off';

function seekMoment(state: PianoStoreState, moment: MomentId): void {
  state.pause();
  state.setPhase(MOMENTS[moment]);
}

function pausedMoment(state: PianoStoreState): MomentId | undefined {
  if (state.playing) return undefined;
  return MOMENT_IDS.find((moment) => MOMENTS[moment] === state.phase);
}

function setSound(state: PianoStoreState, option: SoundOptionId): void {
  state.setView({ sound: option === SOUND_ON });
}

export const CHAPTER_ACTIONS: Record<ChapterActionId, ChapterAction<PianoStoreState>> = {
  touch: {
    run: applyTouchChoice,
    current: (state) => state.touch,
  },
  pedal: {
    run: applyPedalChoice,
    current: (state) => state.pedal,
  },
  register: {
    run: (state, value) => state.setRegister(parseOption(value, REGISTER_IDS)),
    current: (state) => state.register,
  },
  compare: {
    run: (state, value) => state.setCompare(parseOption(value, COMPARE_IDS)),
    current: (state) => state.compare,
  },
  moment: {
    run: (state, value) => seekMoment(state, parseOption(value, MOMENT_IDS)),
    current: (state) => pausedMoment(state) ?? NOTHING_CURRENT,
  },
  sound: {
    run: (state, value) => setSound(state, parseOption(value, SOUND_OPTION_IDS)),
    current: (state) => (state.view.sound ? SOUND_ON : SOUND_OFF),
  },
};
