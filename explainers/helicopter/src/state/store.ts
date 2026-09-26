import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { createExplainerStore } from '@core/store';
import { COLLECTIVE_RANGE, clampCollective } from '../model';
import type { FlightMode } from '../model';
import { HELICOPTER_TIMELINE, RPM_RANGE } from '../timeline';
import { PRESETS } from './presets';
import type { Preset, PresetId, ViewOptions } from './presets';

export interface HelicopterFields {
  collective: number;
  flightMode: FlightMode;
  view: ViewOptions;
  preset: PresetId;
}

export interface HelicopterOwnActions {
  setCollective(collective: number): void;
  setFlightMode(mode: FlightMode): void;
}

export type HelicopterState = PlaybackState & HelicopterFields;
export type HelicopterStoreState = Playback & HelicopterFields & HelicopterOwnActions;
export type HelicopterStore = ExplainerStore<HelicopterStoreState>;

export const DEFAULT_VIEW: ViewOptions = { labels: false, flow: true };

export function createHelicopterStore(
  overrides: Partial<HelicopterStoreState> = {},
): HelicopterStore {
  return createExplainerStore<HelicopterFields & HelicopterOwnActions, Preset>(
    {
      timeline: HELICOPTER_TIMELINE,
      presets: PRESETS,
      defaults: { preset: 'overview', speed: RPM_RANGE.default, view: DEFAULT_VIEW },
      extend: (set) => ({
        collective: COLLECTIVE_RANGE.hover,
        flightMode: 'hover',
        setCollective: (collective) => set({ collective: clampCollective(collective) }),
        setFlightMode: (flightMode) => set({ flightMode }),
      }),
      presetState: (preset, state) => ({
        flightMode: preset.flightMode ?? state.flightMode,
        collective: preset.collective ?? state.collective,
      }),
    },
    overrides,
  );
}
