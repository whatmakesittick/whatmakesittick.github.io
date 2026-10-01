import type { ScenePreset } from '@core/scene/presetBinder';

export type PresetId = 'overview' | 'glide' | 'thermal' | 'cloud' | 'ridge' | 'wave';

export type CameraView = 'overview' | 'chase' | 'thermal' | 'cloud' | 'ridge' | 'wave';

export type PartId =
  | 'wing'
  | 'fuselage'
  | 'tail'
  | 'lift'
  | 'weight'
  | 'drag'
  | 'field'
  | 'thermal'
  | 'cumulus'
  | 'wind'
  | 'ridge'
  | 'rotor'
  | 'wave'
  | 'lenticular';

export type ViewOptions = {
  forces: boolean;
  air: boolean;
  labels: boolean;
};

export interface Preset extends ScenePreset<PartId, CameraView> {
  view?: Partial<ViewOptions>;
}

export const PRESETS: Record<PresetId, Preset> = {
  overview: {
    camera: 'overview',
    speed: 60,
    view: { air: true, forces: false },
    labels: ['field', 'thermal', 'cumulus', 'ridge', 'wave'],
    highlight: [],
  },
  glide: {
    camera: 'chase',
    speed: 30,
    view: { air: false, forces: true },
    startAt: 520,
    labels: ['wing', 'lift', 'weight', 'drag'],
    highlight: ['wing', 'lift', 'weight', 'drag'],
  },
  thermal: {
    camera: 'thermal',
    speed: 15,
    view: { air: true, forces: false },
    startAt: 60,
    labels: ['field', 'thermal'],
    highlight: ['thermal'],
  },
  cloud: {
    camera: 'cloud',
    speed: 15,
    view: { air: true, forces: false },
    pauseAt: 430,
    labels: ['cumulus', 'thermal'],
    highlight: ['cumulus'],
  },
  ridge: {
    camera: 'ridge',
    speed: 30,
    view: { air: true, forces: false },
    startAt: 1010,
    labels: ['ridge', 'wind'],
    highlight: ['wind'],
  },
  wave: {
    camera: 'wave',
    speed: 60,
    view: { air: true, forces: false },
    startAt: 1300,
    labels: ['rotor', 'wave', 'lenticular'],
    highlight: ['wave', 'lenticular', 'rotor'],
  },
};
