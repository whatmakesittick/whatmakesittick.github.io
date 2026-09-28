import type { ScenePreset } from '@core/scene/presetBinder';

export type PresetId = 'overview' | 'lens' | 'objective' | 'eyepiece' | 'limit' | 'focus';

export type CameraView = 'overview' | 'condenser' | 'objective' | 'eyepiece' | 'aperture' | 'stage';

export type PartId =
  | 'lamp'
  | 'fieldDiaphragm'
  | 'condenser'
  | 'irisDiaphragm'
  | 'stage'
  | 'specimen'
  | 'objective'
  | 'nosepiece'
  | 'tube'
  | 'intermediateImage'
  | 'eyepiece'
  | 'eye'
  | 'retina'
  | 'focusKnob';

export type ViewOptions = {
  rays: boolean;
  labels: boolean;
  cutaway: boolean;
};

export interface Preset extends ScenePreset<PartId, CameraView> {
  view?: Partial<ViewOptions>;
}

export const PRESETS: Record<PresetId, Preset> = {
  overview: {
    camera: 'overview',
    speed: 80,
    view: { rays: true, cutaway: true },
    labels: [],
    highlight: [],
  },
  lens: {
    camera: 'condenser',
    speed: 60,
    view: { rays: true },
    startAt: 60,
    labels: ['lamp', 'condenser', 'specimen'],
    highlight: ['condenser'],
  },
  objective: {
    camera: 'objective',
    speed: 40,
    view: { rays: true },
    startAt: 136,
    labels: ['objective', 'specimen', 'intermediateImage'],
    highlight: ['objective'],
  },
  eyepiece: {
    camera: 'eyepiece',
    speed: 40,
    view: { rays: true },
    pauseAt: 395,
    labels: ['intermediateImage', 'eyepiece', 'eye', 'retina'],
    highlight: ['eyepiece', 'eye'],
  },
  limit: {
    camera: 'aperture',
    speed: 40,
    view: { rays: true },
    pauseAt: 140,
    labels: ['objective', 'specimen'],
    highlight: ['objective'],
  },
  focus: {
    camera: 'stage',
    speed: 80,
    view: { rays: true },
    startAt: 120,
    labels: ['stage', 'focusKnob', 'condenser'],
    highlight: ['stage', 'focusKnob'],
  },
};
