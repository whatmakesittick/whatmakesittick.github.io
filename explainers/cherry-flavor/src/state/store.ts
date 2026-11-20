import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { clamp } from '@core/math';
import { createExplainerStore } from '@core/store';
import type {
  FlavorId,
  OdorantId,
  OdorantLevels,
  PresetId,
  RecipeId,
  ScaleId,
  SniffId,
  ViewOptions,
} from '../ids';
import {
  DESK_RECIPES,
  DESK_START,
  DROPS_RANGE,
  FAT_RANGE_PERCENT,
  SERVING_RANGE_C,
} from '../model';
import { SPEED_RANGE } from '../model/playback';
import { BITE_TIMELINE } from '../timeline';
import { CHAPTER_CONTROL_DEFAULTS, PRESETS, RUN_START } from './presets';
import type { ChapterControls, Preset } from './presets';

export type ViewState = { [Key in keyof ViewOptions]: ViewOptions[Key] };

export interface FlavorFields extends ChapterControls {
  desk: OdorantLevels;
  view: ViewState;
  preset: PresetId;
}

export interface FlavorOwnActions {
  setScale(scale: ScaleId): void;
  setFlavor(flavor: FlavorId): void;
  setSniff(sniff: SniffId): void;
  setDrops(id: OdorantId, drops: number): void;
  loadRecipe(recipe: RecipeId): void;
  setServing(celsius: number): void;
  setFat(percent: number): void;
}

export type FlavorState = PlaybackState & FlavorFields;
export type FlavorStoreState = Playback & FlavorFields & FlavorOwnActions;
export type FlavorStore = ExplainerStore<FlavorStoreState>;

interface SteppedRange {
  min: number;
  max: number;
  step: number;
}

export const DEFAULT_VIEW: ViewState = { labels: true, pinched: false };

const START_PRESET: PresetId = 'tongue';
const START_SPEED = PRESETS[START_PRESET].speed ?? SPEED_RANGE.default;
export const START_PHASE = PRESETS[START_PRESET].startAt ?? RUN_START;

export function snapToRange(value: number, { min, max, step }: SteppedRange): number {
  const snapped = min + Math.round((value - min) / step) * step;
  return clamp(snapped, min, max);
}

function presetFields(preset: Preset, state: FlavorFields): Partial<FlavorFields> {
  if (PRESETS[state.preset] === preset) return {};
  return { ...CHAPTER_CONTROL_DEFAULTS, ...preset.start };
}

export function createFlavorStore(overrides: Partial<FlavorStoreState> = {}): FlavorStore {
  return createExplainerStore<FlavorFields & FlavorOwnActions, Preset>(
    {
      timeline: BITE_TIMELINE,
      presets: PRESETS,
      defaults: { preset: START_PRESET, speed: START_SPEED, view: DEFAULT_VIEW },
      extend: (set, get) => ({
        ...CHAPTER_CONTROL_DEFAULTS,
        ...PRESETS[START_PRESET].start,
        desk: { ...DESK_START },
        setScale: (scale) => set({ scale }),
        setFlavor: (flavor) => set({ flavor }),
        setSniff: (sniff) => set({ sniff }),
        setDrops: (id, drops) => {
          const snapped = snapToRange(drops, DROPS_RANGE);
          const { desk } = get();
          if (snapped !== desk[id]) set({ desk: { ...desk, [id]: snapped } });
        },
        loadRecipe: (recipe) => set({ desk: { ...DESK_RECIPES[recipe] } }),
        setServing: (celsius) => {
          const servingC = snapToRange(celsius, SERVING_RANGE_C);
          if (servingC !== get().servingC) set({ servingC });
        },
        setFat: (percent) => {
          const fatPercent = snapToRange(percent, FAT_RANGE_PERCENT);
          if (fatPercent !== get().fatPercent) set({ fatPercent });
        },
      }),
      presetState: presetFields,
    },
    { phase: START_PHASE, ...overrides },
  );
}
