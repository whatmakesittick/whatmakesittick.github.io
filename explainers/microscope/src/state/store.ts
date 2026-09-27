import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { createExplainerStore } from '@core/store';
import {
  DEFAULT_EYEPIECE,
  DEFAULT_OBJECTIVE,
  FOCUS,
  WAVELENGTH,
  clampFocus,
  clampWavelength,
} from '../model';
import type { EyepieceId, ObjectiveId } from '../model';
import { MICROSCOPE_TIMELINE, SPEED_RANGE } from '../timeline';
import { PRESETS } from './presets';
import type { Preset, PresetId, ViewOptions } from './presets';

export interface MicroscopeFields {
  objective: ObjectiveId;
  eyepiece: EyepieceId;
  wavelength: number;
  focus: number;
  view: ViewOptions;
  preset: PresetId;
}

export interface MicroscopeOwnActions {
  setObjective(objective: ObjectiveId): void;
  setEyepiece(eyepiece: EyepieceId): void;
  setWavelength(nanometres: number): void;
  setFocus(micrometres: number): void;
}

export type MicroscopeState = PlaybackState & MicroscopeFields;
export type MicroscopeStoreState = Playback & MicroscopeFields & MicroscopeOwnActions;
export type MicroscopeStore = ExplainerStore<MicroscopeStoreState>;

export const DEFAULT_VIEW: ViewOptions = { rays: true, labels: false, cutaway: true };

export function createMicroscopeStore(
  overrides: Partial<MicroscopeStoreState> = {},
): MicroscopeStore {
  return createExplainerStore<MicroscopeFields & MicroscopeOwnActions, Preset>(
    {
      timeline: MICROSCOPE_TIMELINE,
      presets: PRESETS,
      defaults: { preset: 'overview', speed: SPEED_RANGE.default, view: DEFAULT_VIEW },
      extend: (set) => ({
        objective: DEFAULT_OBJECTIVE,
        eyepiece: DEFAULT_EYEPIECE,
        wavelength: WAVELENGTH.default,
        focus: FOCUS.default,
        setObjective: (objective) => set({ objective }),
        setEyepiece: (eyepiece) => set({ eyepiece }),
        setWavelength: (nanometres) => set({ wavelength: clampWavelength(nanometres) }),
        setFocus: (micrometres) => set({ focus: clampFocus(micrometres) }),
      }),
    },
    overrides,
  );
}
