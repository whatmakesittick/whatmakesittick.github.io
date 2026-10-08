import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { clamp } from '@core/math';
import { createExplainerStore } from '@core/store';
import type { PresetId, SiteWindId, SpacingD, ViewOptions } from '../ids';
import { DEFAULT_SPACING_D, SPEED_RANGE } from '../model';
import { WIND_FARM_TIMELINE } from '../timeline';
import { PRESETS } from './presets';
import type { ChapterControls, Preset } from './presets';

export type ViewState = { [Key in keyof ViewOptions]: ViewOptions[Key] };

export interface WindFarmFields extends ChapterControls {
  siteWind: SiteWindId;
  view: ViewState;
  preset: PresetId;
}

export interface WindFarmOwnActions {
  setSiteWind(siteWind: SiteWindId): void;
  setSpacing(spacing: SpacingD): void;
  setWindOverride(windOverride: number | null): void;
}

export type WindFarmState = PlaybackState & WindFarmFields;
export type WindFarmStoreState = Playback & WindFarmFields & WindFarmOwnActions;
export type WindFarmStore = ExplainerStore<WindFarmStoreState>;

export interface SteppedRange {
  min: number;
  max: number;
  step: number;
}

export const WIND_OVERRIDE_RANGE = { min: 0, max: 30, step: 0.5 } as const;

export const DEFAULT_VIEW: ViewState = {
  streamlines: true,
  wakes: true,
  cables: true,
  labels: true,
  cutaway: false,
};
export const DEFAULT_SITE_WIND: SiteWindId = 'typical';

export const CHAPTER_CONTROL_DEFAULTS: ChapterControls = {
  spacing: DEFAULT_SPACING_D,
  windOverride: null,
};

const START_PRESET: PresetId = 'farm';
const START_SPEED = PRESETS[START_PRESET].speed ?? SPEED_RANGE.default;
export const START_PHASE = PRESETS[START_PRESET].startAt ?? 0;

export function snapToRange(value: number, { min, max, step }: SteppedRange): number {
  return clamp(min + Math.round((value - min) / step) * step, min, max);
}

function snapOverride(windOverride: number | null): number | null {
  return windOverride === null ? null : snapToRange(windOverride, WIND_OVERRIDE_RANGE);
}

function presetFields(preset: Preset, state: WindFarmFields): Partial<WindFarmFields> {
  if (PRESETS[state.preset] === preset) return {};
  return { ...CHAPTER_CONTROL_DEFAULTS, ...preset.start };
}

export function createWindFarmStore(overrides: Partial<WindFarmStoreState> = {}): WindFarmStore {
  return createExplainerStore<WindFarmFields & WindFarmOwnActions, Preset>(
    {
      timeline: WIND_FARM_TIMELINE,
      presets: PRESETS,
      defaults: { preset: START_PRESET, speed: START_SPEED, view: DEFAULT_VIEW },
      extend: (set) => ({
        ...CHAPTER_CONTROL_DEFAULTS,
        ...PRESETS[START_PRESET].start,
        siteWind: DEFAULT_SITE_WIND,
        setSiteWind: (siteWind) => set({ siteWind }),
        setSpacing: (spacing) => set({ spacing }),
        setWindOverride: (windOverride) => set({ windOverride: snapOverride(windOverride) }),
      }),
      presetState: presetFields,
    },
    { phase: START_PHASE, ...overrides },
  );
}
