import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { createExplainerStore } from '@core/store';
import type { CompareId, PedalId, PresetId, RegisterId, TouchId, ViewOptions } from '../ids';
import { SPEED_RANGE } from '../model';
import { PIANO_TIMELINE } from '../timeline';
import { PRESETS } from './presets';
import type { ChapterControls, Preset } from './presets';

export type ViewState = { [Key in keyof ViewOptions]: ViewOptions[Key] };

export interface PianoFields extends ChapterControls {
  touch: TouchId;
  pedal: PedalId;
  view: ViewState;
  preset: PresetId;
}

export interface PianoOwnActions {
  setTouch(touch: TouchId): void;
  setPedal(pedal: PedalId): void;
  setRegister(register: RegisterId): void;
  setCompare(compare: CompareId): void;
}

export type PianoState = PlaybackState & PianoFields;
export type PianoStoreState = Playback & PianoFields & PianoOwnActions;
export type PianoStore = ExplainerStore<PianoStoreState>;

export const DEFAULT_VIEW: ViewState = {
  sound: false,
  wave: false,
  inset: false,
  ghost: false,
  follow: false,
  labels: true,
  cutaway: false,
  lineUp: false,
};

export const CHAPTER_CONTROL_DEFAULTS: Readonly<ChapterControls> = {
  register: 'middle',
  compare: 'grand',
};

const DEFAULT_TOUCH: TouchId = 'medium';
const DEFAULT_PEDAL: PedalId = 'none';

const START_PRESET: PresetId = 'key';
const START = PRESETS[START_PRESET];
const START_SPEED = START.speed ?? SPEED_RANGE.default;
const START_PAUSED = START.pauseAt !== undefined;
export const START_PHASE = START.pauseAt ?? START.startAt ?? 0;
export const START_VIEW: ViewState = { ...DEFAULT_VIEW, ...START.view };

function presetFields(preset: Preset, state: PianoFields): Partial<PianoFields> {
  if (PRESETS[state.preset] === preset) return {};
  return { ...CHAPTER_CONTROL_DEFAULTS, ...preset.start };
}

export function createPianoStore(overrides: Partial<PianoStoreState> = {}): PianoStore {
  return createExplainerStore<PianoFields & PianoOwnActions, Preset>(
    {
      timeline: PIANO_TIMELINE,
      presets: PRESETS,
      defaults: { preset: START_PRESET, speed: START_SPEED, view: START_VIEW },
      extend: (set) => ({
        ...CHAPTER_CONTROL_DEFAULTS,
        ...START.start,
        touch: DEFAULT_TOUCH,
        pedal: DEFAULT_PEDAL,
        setTouch: (touch) => set({ touch }),
        setPedal: (pedal) => set({ pedal }),
        setRegister: (register) => set({ register }),
        setCompare: (compare) => set({ compare }),
      }),
      presetState: presetFields,
    },
    { phase: START_PHASE, playing: !START_PAUSED, pausedByPreset: START_PAUSED, ...overrides },
  );
}
