import type { ExplainerStore, Playback, PlaybackActions, PlaybackState } from '@core/explainer';
import { createExplainerStore } from '@core/store';
import { ENGINE_SPECS, withCompressionRatio } from '../model';
import type { EngineLayout, EngineSpec, EngineType } from '../model';
import { ENGINE_TIMELINE, RPM_RANGE } from '../timeline';
import { PRESETS } from './presets';
import type { PresetId, ViewOptions } from './presets';

export interface EngineFields {
  engineType: EngineType;
  layout: EngineLayout;
  compressionRatio: number;
  view: ViewOptions;
  preset: PresetId;
}

export interface EngineOwnActions {
  setEngineType(type: EngineType): void;
  setLayout(layout: EngineLayout): void;
  setCompressionRatio(ratio: number): void;
}

export type EngineState = PlaybackState & EngineFields;
export type EngineActions = PlaybackActions & EngineOwnActions;
export type EngineStoreState = Playback & EngineFields & EngineOwnActions;
export type EngineStore = ExplainerStore<EngineStoreState>;

export const DEFAULT_VIEW: ViewOptions = { cutaway: true, gas: true, labels: false, flow: true };

export function currentSpec(
  state: Pick<EngineState, 'engineType' | 'compressionRatio'>,
): EngineSpec {
  return withCompressionRatio(ENGINE_SPECS[state.engineType], state.compressionRatio);
}

export function createEngineStore(overrides: Partial<EngineStoreState> = {}): EngineStore {
  return createExplainerStore<EngineFields & EngineOwnActions, (typeof PRESETS)[PresetId]>(
    {
      timeline: ENGINE_TIMELINE,
      presets: PRESETS,
      defaults: { preset: 'overview', speed: RPM_RANGE.default, view: DEFAULT_VIEW },
      extend: (set, get) => ({
        engineType: 'petrol',
        layout: 'single',
        compressionRatio: ENGINE_SPECS.petrol.compressionRatio,

        setEngineType: (engineType) =>
          set({ engineType, compressionRatio: ENGINE_SPECS[engineType].compressionRatio }),
        setLayout: (layout) => {
          if (layout === get().layout) return;
          set({ layout });
          get().resetCamera();
        },
        setCompressionRatio: (ratio) =>
          set({
            compressionRatio: withCompressionRatio(currentSpec(get()), ratio).compressionRatio,
          }),
      }),
      presetState: (preset, state) => ({
        layout: preset.layout ?? state.layout,
        engineType: preset.engineType ?? state.engineType,
        compressionRatio: preset.engineType
          ? ENGINE_SPECS[preset.engineType].compressionRatio
          : state.compressionRatio,
      }),
    },
    overrides,
  );
}
