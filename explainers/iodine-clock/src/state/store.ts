import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { clamp } from '@core/math';
import { createExplainerStore } from '@core/store';
import type { PresetId, ScaleId, ViewOptions } from '../ids';
import { CYCLE_UNITS, IODATE_RANGE_MM, TEMPERATURE_RANGE_C, advanceUnits } from '../model';
import { SPEED_RANGE, speedFactor } from '../model/playback';
import { CLOCK_TIMELINE_BASE } from '../timeline';
import { switchSecondsOf } from './derived';
import { CHAPTER_CONTROL_DEFAULTS, PRESETS, RUN_START } from './presets';
import type { ChapterControls, Preset } from './presets';

export type ViewState = { [Key in keyof ViewOptions]: ViewOptions[Key] };

export interface ClockFields extends ChapterControls {
  view: ViewState;
  preset: PresetId;
}

export interface ClockOwnActions {
  setScale(scale: ScaleId): void;
  setIodate(millimolar: number): void;
  setTemperature(celsius: number): void;
  mixAgain(): void;
}

export type ClockState = PlaybackState & ClockFields;
export type ClockStoreState = Playback & ClockFields & ClockOwnActions;
export type ClockStore = ExplainerStore<ClockStoreState>;

interface SteppedRange {
  min: number;
  max: number;
  step: number;
}

export const DEFAULT_VIEW: ViewState = { water: true, labels: true };

const START_PRESET: PresetId = 'pour';
const START_SPEED = PRESETS[START_PRESET].speed ?? SPEED_RANGE.default;
export const START_PHASE = PRESETS[START_PRESET].startAt ?? RUN_START;

export function snapToRange(value: number, { min, max, step }: SteppedRange): number {
  const snapped = min + Math.round((value - min) / step) * step;
  return clamp(snapped, min, max);
}

function presetFields(preset: Preset, state: ClockFields): Partial<ClockFields> {
  if (PRESETS[state.preset] === preset) return {};
  return { ...CHAPTER_CONTROL_DEFAULTS, ...preset.start };
}

const RESTART = { phase: RUN_START, playing: true, pausedByPreset: false } as const;

function runClock(store: ClockStore): ClockStore {
  store.setState({
    tick: (deltaSeconds) => {
      const state = store.getState();
      if (!state.playing) return;
      const screenSeconds = deltaSeconds * speedFactor(state.speed);
      const phase = advanceUnits(state.phase, screenSeconds, switchSecondsOf(state));
      store.setState({ phase, playing: phase < CYCLE_UNITS });
    },
  });
  return store;
}

export function createClockStore(overrides: Partial<ClockStoreState> = {}): ClockStore {
  const store = createExplainerStore<ClockFields & ClockOwnActions, Preset>(
    {
      timeline: CLOCK_TIMELINE_BASE,
      presets: PRESETS,
      defaults: { preset: START_PRESET, speed: START_SPEED, view: DEFAULT_VIEW },
      extend: (set, get) => {
        return {
          ...CHAPTER_CONTROL_DEFAULTS,
          ...PRESETS[START_PRESET].start,
          setScale: (scale) => set({ scale }),
          setIodate: (millimolar) => {
            const iodateMm = snapToRange(millimolar, IODATE_RANGE_MM);
            if (iodateMm !== get().iodateMm) set({ iodateMm });
          },
          setTemperature: (celsius) => {
            const temperatureC = snapToRange(celsius, TEMPERATURE_RANGE_C);
            if (temperatureC !== get().temperatureC) set({ temperatureC });
          },
          mixAgain: () => set(RESTART),
        };
      },
      presetState: presetFields,
    },
    { phase: START_PHASE, ...overrides },
  );
  return runClock(store);
}
