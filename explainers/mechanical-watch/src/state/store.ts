import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { clamp } from '@core/math';
import { createExplainerStore } from '@core/store';
import type { BeatRateId, ViewOptions, WheelId } from '../ids';
import { amplitude, cycleCountAfter, dailyRate } from '../model';
import { SPEED_RANGE, WATCH_TIMELINE } from '../timeline';
import { PRESETS } from './presets';
import type { ChapterControl, Preset, PresetId } from './presets';
import { REGULATOR_RANGE, RESERVE_RANGE } from './ranges';

export interface WatchFields {
  reserve: number;
  regulator: number;
  wheel: WheelId;
  beatRate: BeatRateId;
  cycles: number;
  view: ViewState;
  preset: PresetId;
}

export interface WatchOwnActions {
  setReserve(hours: number): void;
  setRegulator(index: number): void;
  setWheel(wheel: WheelId): void;
  setBeatRate(beatRate: BeatRateId): void;
}

export type WatchState = PlaybackState & WatchFields;
export type WatchStoreState = Playback & WatchFields & WatchOwnActions;
export type WatchStore = ExplainerStore<WatchStoreState>;

export type ViewState = { [Key in keyof ViewOptions]: ViewOptions[Key] };

type ChapterControls = Pick<WatchFields, ChapterControl>;

export const DEFAULT_VIEW: ViewState = { dial: true, bridges: true, energy: false, labels: false };
export const DEFAULT_WHEEL: WheelId = 'centreWheel';
export const DEFAULT_BEAT_RATE: BeatRateId = 'vph28800';

const CHAPTER_CONTROL_DEFAULTS: ChapterControls = {
  reserve: RESERVE_RANGE.default,
  regulator: REGULATOR_RANGE.default,
  wheel: DEFAULT_WHEEL,
  beatRate: DEFAULT_BEAT_RATE,
};

function within(value: number, range: { min: number; max: number }): number {
  return clamp(value, range.min, range.max);
}

export function amplitudeOf(state: Pick<WatchFields, 'reserve'>): number {
  return amplitude(state.reserve);
}

export function dailyRateOf(state: Pick<WatchFields, 'regulator'>): number {
  return dailyRate(state.regulator);
}

function chapterControls(preset: Preset, state: ChapterControls): ChapterControls {
  const keeps = (control: ChapterControl) => preset.controls?.includes(control) ?? false;
  return {
    reserve: keeps('reserve') ? state.reserve : CHAPTER_CONTROL_DEFAULTS.reserve,
    regulator: keeps('regulator') ? state.regulator : CHAPTER_CONTROL_DEFAULTS.regulator,
    wheel: keeps('wheel') ? state.wheel : CHAPTER_CONTROL_DEFAULTS.wheel,
    beatRate: keeps('beatRate') ? state.beatRate : CHAPTER_CONTROL_DEFAULTS.beatRate,
  };
}

function countCycles(store: WatchStore): WatchStore {
  store.subscribe(
    (state) => state.phase,
    (phase, previous) => {
      const { cycles } = store.getState();
      const next = cycleCountAfter(previous, phase, cycles);
      if (next !== cycles) store.setState({ cycles: next });
    },
  );
  return store;
}

export function createWatchStore(overrides: Partial<WatchStoreState> = {}): WatchStore {
  const store = createExplainerStore<WatchFields & WatchOwnActions, Preset>(
    {
      timeline: WATCH_TIMELINE,
      presets: PRESETS,
      defaults: { preset: 'overview', speed: SPEED_RANGE.default, view: DEFAULT_VIEW },
      extend: (set) => ({
        ...CHAPTER_CONTROL_DEFAULTS,
        cycles: 0,
        setReserve: (hours) => set({ reserve: within(hours, RESERVE_RANGE) }),
        setRegulator: (index) => set({ regulator: within(index, REGULATOR_RANGE) }),
        setWheel: (wheel) => set({ wheel }),
        setBeatRate: (beatRate) => set({ beatRate }),
      }),
      presetState: chapterControls,
    },
    overrides,
  );
  return countCycles(store);
}
