import type { Preset as PlaybackPreset } from '@core/explainer';

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

export interface Preset extends PlaybackPreset {
  camera: CameraView;
  labels: readonly PartId[];
  highlight: readonly PartId[];
  view?: Partial<ViewOptions>;
}

export const PRESETS: Record<PresetId, Preset> = {
  overview: {
    camera: 'overview',
    speed: 60,
    view: { air: true, forces: false },
    labels: [],
    highlight: [],
  },
  glide: {
    camera: 'chase',
    speed: 30,
    view: { air: false, forces: true },
    startAt: 520,
    labels: ['wing', 'lift', 'weight', 'drag'],
    highlight: ['wing'],
  },
  thermal: {
    camera: 'thermal',
    speed: 15,
    view: { air: true },
    startAt: 60,
    labels: ['field', 'thermal'],
    highlight: ['thermal', 'field'],
  },
  cloud: {
    camera: 'cloud',
    speed: 15,
    view: { air: true },
    pauseAt: 430,
    labels: ['cumulus', 'thermal'],
    highlight: ['cumulus'],
  },
  ridge: {
    camera: 'ridge',
    speed: 30,
    view: { air: true },
    startAt: 1010,
    labels: ['ridge', 'wind'],
    highlight: ['ridge', 'wind'],
  },
  wave: {
    camera: 'wave',
    speed: 60,
    view: { air: true },
    startAt: 1300,
    labels: ['rotor', 'wave', 'lenticular'],
    highlight: ['wave', 'lenticular', 'rotor'],
  },
};
