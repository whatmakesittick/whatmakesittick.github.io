import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { createExplainerStore } from '@core/store';
import { STITCH_LENGTH, clampStitchLength } from '../model';
import type { Tension } from '../model';
import { SEWING_TIMELINE, SPM_RANGE } from '../timeline';
import { PRESETS } from './presets';
import type { Preset, PresetId, ViewOptions } from './presets';

export interface SewingFields {
  stitchLength: number;
  tension: Tension;
  view: ViewOptions;
  preset: PresetId;
}

export interface SewingOwnActions {
  setStitchLength(millimetres: number): void;
  setTension(tension: Tension): void;
}

export type SewingState = PlaybackState & SewingFields;
export type SewingStoreState = Playback & SewingFields & SewingOwnActions;
export type SewingStore = ExplainerStore<SewingStoreState>;

const DEFAULT_VIEW: ViewOptions = { labels: true, cutaway: false };
const DEFAULT_TENSION: Tension = 'balanced';

export function createSewingStore(overrides: Partial<SewingStoreState> = {}): SewingStore {
  return createExplainerStore<SewingFields & SewingOwnActions, Preset>(
    {
      timeline: SEWING_TIMELINE,
      presets: PRESETS,
      defaults: { preset: 'overview', speed: SPM_RANGE.default, view: DEFAULT_VIEW },
      extend: (set) => ({
        stitchLength: STITCH_LENGTH.default,
        tension: DEFAULT_TENSION,
        setStitchLength: (millimetres) => set({ stitchLength: clampStitchLength(millimetres) }),
        setTension: (tension) => set({ tension }),
      }),
    },
    overrides,
  );
}
