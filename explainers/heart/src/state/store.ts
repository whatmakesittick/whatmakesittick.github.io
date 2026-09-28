import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { clamp } from '@core/math';
import { createExplainerStore } from '@core/store';
import type { ChamberId, ValveId, ViewOptions } from '../ids';
import type { FitnessId } from '../model';
import { HEART_TIMELINE, SPEED_RANGE } from '../timeline';
import { DEFAULT_CHAMBER, DEFAULT_FITNESS, DEFAULT_VALVE, PRESETS } from './presets';
import type { ChapterControl, Preset, PresetId } from './presets';
import { EFFORT_RANGE } from './ranges';

export interface HeartFields {
  chamber: ChamberId;
  valve: ValveId;
  effort: number;
  fitness: FitnessId;
  view: ViewState;
  preset: PresetId;
}

export interface HeartOwnActions {
  setChamber(chamber: ChamberId): void;
  setValve(valve: ValveId): void;
  setEffort(effort: number): void;
  setFitness(fitness: FitnessId): void;
}

export type HeartState = PlaybackState & HeartFields;
export type HeartStoreState = Playback & HeartFields & HeartOwnActions;
export type HeartStore = ExplainerStore<HeartStoreState>;

export type ViewState = { [Key in keyof ViewOptions]: ViewOptions[Key] };

type ChapterControls = Pick<HeartFields, ChapterControl>;

export const DEFAULT_VIEW: ViewState = {
  cutaway: false,
  flow: true,
  conduction: false,
  labels: false,
};
const START_SPEED = PRESETS.overview.speed ?? SPEED_RANGE.default;

const CHAPTER_CONTROL_DEFAULTS: ChapterControls = {
  chamber: DEFAULT_CHAMBER,
  valve: DEFAULT_VALVE,
  effort: EFFORT_RANGE.default,
  fitness: DEFAULT_FITNESS,
};

function within(value: number, range: { min: number; max: number }): number {
  return clamp(value, range.min, range.max);
}

function chapterControls(preset: Preset, state: HeartFields): ChapterControls {
  const keeps = (control: ChapterControl) => preset.controls?.includes(control) ?? false;
  const defaults = CHAPTER_CONTROL_DEFAULTS;
  return {
    chamber: keeps('chamber') ? state.chamber : defaults.chamber,
    valve: keeps('valve') ? state.valve : defaults.valve,
    effort: keeps('effort') ? state.effort : defaults.effort,
    fitness: keeps('fitness') ? state.fitness : defaults.fitness,
  };
}

export function createHeartStore(overrides: Partial<HeartStoreState> = {}): HeartStore {
  return createExplainerStore<HeartFields & HeartOwnActions, Preset>(
    {
      timeline: HEART_TIMELINE,
      presets: PRESETS,
      defaults: { preset: 'overview', speed: START_SPEED, view: DEFAULT_VIEW },
      extend: (set) => ({
        ...CHAPTER_CONTROL_DEFAULTS,
        setChamber: (chamber) => set({ chamber }),
        setValve: (valve) => set({ valve }),
        setEffort: (effort) => set({ effort: within(effort, EFFORT_RANGE) }),
        setFitness: (fitness) => set({ fitness }),
      }),
      presetState: chapterControls,
    },
    overrides,
  );
}
