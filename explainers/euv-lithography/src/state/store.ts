import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { createExplainerStore } from '@core/store';
import type { MachineId, PresetId, ViewOptions } from '../ids';
import { SPEED_RANGE } from '../model';
import { DEFAULT_CLOCK_MACHINE, EUV_TIMELINE } from '../timeline';
import { PRESETS } from './presets';
import type { Preset } from './presets';

export type ViewState = { [Key in keyof ViewOptions]: ViewOptions[Key] };

export interface EuvFields {
  machine: MachineId;
  view: ViewState;
  preset: PresetId;
}

export interface EuvOwnActions {
  setMachine(machine: MachineId): void;
}

export type EuvState = PlaybackState & EuvFields;
export type EuvStoreState = Playback & EuvFields & EuvOwnActions;
export type EuvStore = ExplainerStore<EuvStoreState>;

export const DEFAULT_VIEW: ViewState = {
  beam: true,
  labels: true,
  cutaway: false,
  inset: true,
  follow: false,
};

const START_PRESET: PresetId = 'machine';
const START = PRESETS[START_PRESET];
const START_SPEED = START.speed ?? SPEED_RANGE.default;
const START_PAUSED = START.pauseAt !== undefined;
export const START_PHASE = START.pauseAt ?? START.startAt ?? 0;
export const START_VIEW: ViewState = { ...DEFAULT_VIEW, ...START.view };

export function createEuvStore(overrides: Partial<EuvStoreState> = {}): EuvStore {
  return createExplainerStore<EuvFields & EuvOwnActions, Preset>(
    {
      timeline: EUV_TIMELINE,
      presets: PRESETS,
      defaults: { preset: START_PRESET, speed: START_SPEED, view: START_VIEW },
      extend: (set) => ({
        machine: DEFAULT_CLOCK_MACHINE,
        setMachine: (machine) => set({ machine }),
      }),
    },
    { phase: START_PHASE, playing: !START_PAUSED, pausedByPreset: START_PAUSED, ...overrides },
  );
}
