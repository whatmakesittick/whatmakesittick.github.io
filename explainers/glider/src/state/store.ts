import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { createExplainerStore } from '@core/store';
import { DEFAULT_GLIDER, POLAR_SPEED, SPREAD, clampPolarSpeed, clampSpread } from '../model';
import type { GliderType } from '../model';
import { GLIDER_TIMELINE, SPEED_RANGE } from '../timeline';
import { PRESETS } from './presets';
import type { Preset, PresetId, ViewOptions } from './presets';

export interface GliderFields {
  glider: GliderType;
  polarSpeed: number;
  spread: number;
  view: ViewOptions;
  preset: PresetId;
}

export interface GliderOwnActions {
  setGlider(type: GliderType): void;
  setPolarSpeed(kmh: number): void;
  setSpread(degrees: number): void;
}

export type GliderState = PlaybackState & GliderFields;
export type GliderStoreState = Playback & GliderFields & GliderOwnActions;
export type GliderStore = ExplainerStore<GliderStoreState>;

export const DEFAULT_VIEW: ViewOptions = { forces: false, air: true, labels: false };

export function createGliderStore(overrides: Partial<GliderStoreState> = {}): GliderStore {
  return createExplainerStore<GliderFields & GliderOwnActions, Preset>(
    {
      timeline: GLIDER_TIMELINE,
      presets: PRESETS,
      defaults: { preset: 'overview', speed: SPEED_RANGE.default, view: DEFAULT_VIEW },
      extend: (set) => ({
        glider: DEFAULT_GLIDER,
        polarSpeed: POLAR_SPEED.default,
        spread: SPREAD.default,
        setGlider: (glider) => set({ glider }),
        setPolarSpeed: (kmh) => set({ polarSpeed: clampPolarSpeed(kmh) }),
        setSpread: (degrees) => set({ spread: clampSpread(degrees) }),
      }),
    },
    overrides,
  );
}
