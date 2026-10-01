import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { clamp } from '@core/math';
import { createExplainerStore } from '@core/store';
import type { LayerId, LayoutId, ViewOptions } from '../ids';
import { SOLAR_PANEL_TIMELINE, SPEED_RANGE } from '../timeline';
import { PRESETS } from './presets';
import type { ChapterControl, Preset, PresetId } from './presets';
import {
  EXPLODE_RANGE,
  SHADE_RANGE,
  TEMPERATURE_RANGE,
  TILT_RANGE,
  WAVELENGTH_RANGE,
} from './ranges';

export interface SolarPanelFields {
  tilt: number;
  explode: number;
  layer: LayerId;
  wavelength: number;
  shade: number;
  layout: LayoutId;
  temperature: number | null;
  view: ViewState;
  preset: PresetId;
}

export interface SolarPanelOwnActions {
  setTilt(degrees: number): void;
  setExplode(share: number): void;
  setLayer(layer: LayerId): void;
  setWavelength(nanometres: number): void;
  setShade(share: number): void;
  setLayout(layout: LayoutId): void;
  setTemperature(celsius: number | null): void;
}

export type SolarPanelState = PlaybackState & SolarPanelFields;
export type SolarPanelStoreState = Playback & SolarPanelFields & SolarPanelOwnActions;
export type SolarPanelStore = ExplainerStore<SolarPanelStoreState>;

export type ViewState = { [Key in keyof ViewOptions]: ViewOptions[Key] };

type ResetControl = Exclude<ChapterControl, 'tilt'>;
type ChapterControls = Pick<SolarPanelFields, ResetControl>;

export const DEFAULT_VIEW: ViewState = { sun: true, slice: false, flow: false, labels: true };
export const DEFAULT_LAYER: LayerId = 'glass';
export const DEFAULT_LAYOUT: LayoutId = 'halfCut';
export const START_PHASE = PRESETS.overview.startAt ?? 0;
export const START_SPEED = PRESETS.overview.speed ?? SPEED_RANGE.default;

const CHAPTER_CONTROL_DEFAULTS: ChapterControls = {
  explode: EXPLODE_RANGE.default,
  layer: DEFAULT_LAYER,
  wavelength: WAVELENGTH_RANGE.default,
  shade: SHADE_RANGE.default,
  layout: DEFAULT_LAYOUT,
  temperature: null,
};

function within(value: number, range: { min: number; max: number }): number {
  return clamp(value, range.min, range.max);
}

function chapterControls(preset: Preset, state: SolarPanelFields): ChapterControls {
  const keeps = (control: ResetControl) => preset.controls?.includes(control) ?? false;
  const reentering = PRESETS[state.preset] === preset;
  const defaults = CHAPTER_CONTROL_DEFAULTS;
  return {
    explode: keeps('explode') && reentering ? state.explode : (preset.explode ?? defaults.explode),
    layer: keeps('layer') ? state.layer : defaults.layer,
    wavelength: keeps('wavelength') ? state.wavelength : defaults.wavelength,
    shade: keeps('shade') ? state.shade : defaults.shade,
    layout: keeps('layout') ? state.layout : defaults.layout,
    temperature: keeps('temperature') ? state.temperature : defaults.temperature,
  };
}

export function createSolarPanelStore(
  overrides: Partial<SolarPanelStoreState> = {},
): SolarPanelStore {
  return createExplainerStore<SolarPanelFields & SolarPanelOwnActions, Preset>(
    {
      timeline: SOLAR_PANEL_TIMELINE,
      presets: PRESETS,
      defaults: { preset: 'overview', speed: START_SPEED, view: DEFAULT_VIEW },
      extend: (set) => ({
        ...CHAPTER_CONTROL_DEFAULTS,
        tilt: TILT_RANGE.default,
        setTilt: (degrees) => set({ tilt: within(degrees, TILT_RANGE) }),
        setExplode: (share) => set({ explode: within(share, EXPLODE_RANGE) }),
        setLayer: (layer) => set({ layer }),
        setWavelength: (nanometres) => set({ wavelength: within(nanometres, WAVELENGTH_RANGE) }),
        setShade: (share) => set({ shade: within(share, SHADE_RANGE) }),
        setLayout: (layout) => set({ layout }),
        setTemperature: (celsius) =>
          set({ temperature: celsius === null ? null : within(celsius, TEMPERATURE_RANGE) }),
      }),
      presetState: chapterControls,
    },
    { phase: START_PHASE, ...overrides },
  );
}
